// Model presets for each LLM (copied from options.js)
const MODEL_OPTIONS = {
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4.1', label: 'GPT-4.1' },
    { value: 'o3', label: 'o3' },
    { value: 'o3-mini', label: 'o3-mini' },
    { value: 'o4-mini', label: 'o4-mini' },
  ],
  claude: [
    { value: 'claude-3-5-haiku-latest', label: 'Haiku 3.5' },
    { value: 'claude-3-7-sonnet-latest', label: 'Sonnet 3.7' },
    { value: 'claude-sonnet-4-20250514', label: 'Sonnet 4' },
    { value: 'claude-opus-4-20250514', label: 'Opus 4' },
  ],
  deepseek: [
    { value: 'deepseek-chat', label: 'V3' },
    { value: 'deepseek-reasoner', label: 'R1' },
  ]
};

document.addEventListener("DOMContentLoaded", async () => {
    const summaryDiv = document.getElementById("summary");
    const cachedMsgDiv = document.getElementById("cachedMsg");
    const summarizeBtn = document.getElementById("summarizeBtn");
    const errorMessages = document.getElementById("error-messages");
    const togglePromptLink = document.getElementById('togglePrompt');
    const customPromptTextarea = document.getElementById('customPrompt');
    const modelOverrideSelect = document.getElementById('modelOverride');

    // Get user settings from storage
    const {
      llm,
      model,
      openAiKey,
      claudeKey,
      deepSeekKey,
      summarizationPrompt
    } = await chrome.storage.sync.get(["llm", "model", "openAiKey", "claudeKey", "deepSeekKey", "summarizationPrompt"]);

    // Populate model override dropdown based on current LLM
    function populateModelOverride() {
        // Clear existing options
        modelOverrideSelect.innerHTML = '';

        // Add all models from all LLMs, grouped by provider
        Object.keys(MODEL_OPTIONS).forEach(llmKey => {
            const llmLabel = llmKey.charAt(0).toUpperCase() + llmKey.slice(1);
            const optgroup = document.createElement('optgroup');
            optgroup.label = llmLabel;

            MODEL_OPTIONS[llmKey].forEach((m) => {
                const opt = document.createElement('option');
                opt.value = `${llmKey}:${m.value}`;
                opt.textContent = m.label;
                optgroup.appendChild(opt);
            });

            modelOverrideSelect.appendChild(optgroup);
        });
    }

    // Get the default model from storage or use fallback
    const { defaultLlm, defaultModel } = await chrome.storage.sync.get(['defaultLlm', 'defaultModel']);
    const currentLlm = defaultLlm || 'openai';
    const currentModel = defaultModel || 'o4-mini';

    // Populate the model dropdown
    populateModelOverride();

    // Set the current default as selected
    modelOverrideSelect.value = `${currentLlm}:${currentModel}`;

    // Save new default when model selection changes
    modelOverrideSelect.addEventListener('change', async (e) => {
        const selectedValue = e.target.value;
        if (selectedValue) {
            const [selectedLlm, selectedModel] = selectedValue.split(':');
            await chrome.storage.sync.set({
                defaultLlm: selectedLlm,
                defaultModel: selectedModel
            });

            // Update the header display
            const modelSelectedSpan = document.querySelector('#model-selected span');
            if (selectedLlm === 'openai') {
              modelSelectedSpan.textContent = `OpenAI / ${selectedModel}`;
            } else if (selectedLlm === 'claude') {
              modelSelectedSpan.textContent = `Claude / ${selectedModel}`;
            } else if (selectedLlm === 'deepseek') {
              modelSelectedSpan.textContent = `DeepSeek / ${selectedModel}`;
            }
        }
    });

    // Check API key availability
    const missingKeys = [];
    if (!openAiKey) missingKeys.push('OpenAI');
    if (!claudeKey) missingKeys.push('Claude');
    if (!deepSeekKey) missingKeys.push('DeepSeek');

    if (missingKeys.length === 3) {
      // No API keys set at all
      summarizeBtn.disabled = true;
      errorMessages.textContent = 'Please set at least one API key in options first';
    } else if (missingKeys.length > 0) {
      // Some keys missing, show informational warning
    //   errorMessages.textContent = `Missing API keys: ${missingKeys.join(', ')}. Set keys in options to use those models.`;
    }

    // Get the current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tab.url;

    // Load cached summaries
    const { summaries = [] } = await chrome.storage.local.get("summaries");
    const existing = summaries.find(s => s.url === currentUrl);

    // Show cached summary if present
    if (existing) {
      cachedMsgDiv.textContent = "Showing previously generated summary";
      summaryDiv.innerHTML = existing.summary;
    } else {
      cachedMsgDiv.textContent = "No cached summary for this page.";
      summaryDiv.textContent = "";
    }

    // Update model selection display
    const modelSelectedSpan = document.querySelector('#model-selected span');
    if (currentLlm === 'openai') {
      modelSelectedSpan.textContent = `OpenAI / ${currentModel}`;
    } else if (currentLlm === 'claude') {
      modelSelectedSpan.textContent = `Claude / ${currentModel}`;
    } else if (currentLlm === 'deepseek') {
      modelSelectedSpan.textContent = `DeepSeek / ${currentModel}`;
    } else {
      modelSelectedSpan.textContent = 'Unknown model';
    }

    // Add this after getting settings from storage
    customPromptTextarea.value = summarizationPrompt || "Summarize the following text:";

    // Add this event listener after DOMContentLoaded
    togglePromptLink.addEventListener('click', (e) => {
        e.preventDefault();
        customPromptTextarea.style.display = customPromptTextarea.style.display === 'none' ? 'block' : 'none';
    });

    summarizeBtn.addEventListener("click", async () => {
      summaryDiv.textContent = "Summarizing...";
      cachedMsgDiv.textContent = "";

      // Get the page text
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.body.innerText
      });
      const pageText = results[0].result || "";

      // Replace the prompt setting logic with:
      const finalPrompt = customPromptTextarea.value.trim() ||
          "Summarize the following text by first telling me what this text is about and then bullet points of the key points.";

      // Append markdown format instruction
      // finalPrompt += " Summary MUST be returned in valid HTML5 format. The output should not have ```html opening and closing ticks";
      forceHtmlPrompt = " Summary MUST be returned in valid HTML5 format. The output should not have ```html opening and closing ticks";

      // Get the model to use - always use the current selection from dropdown
      const selectedValue = modelOverrideSelect.value;
      const [llmToUse, modelToUse] = selectedValue.split(':');

      // Determine which key to use based on the LLM
      let usedKey;
      if (llmToUse === "claude") {
        usedKey = claudeKey;
      } else if (llmToUse === "deepseek") {
        usedKey = deepSeekKey;
      } else {
        usedKey = openAiKey;
      }

      if (!usedKey) {
        summaryDiv.textContent = `Please set your ${llmToUse} API key in extension options.`;
        return;
      }

      console.log('modelToUse >> ', modelToUse);
      console.log('llmToUse >> ', llmToUse);
      console.log('finalPrompt >> ', finalPrompt);

      try {
        let rawSummary;

        if (llmToUse === "claude") {

          // Call Claude API
          const claudePrompt = `Human: ${finalPrompt}\n${pageText}\n\nAssistant:`;
          const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "anthropic-version": "2023-06-01",
              "x-api-key": usedKey,
              "anthropic-dangerous-direct-browser-access": "true"
            },
            body: JSON.stringify({
              max_tokens: 500,
              system: "You are a helpful assistant that summarizes web pages into a concise and informative summary." + forceHtmlPrompt,
              messages: [
                { role: "user", content: claudePrompt },
                { role: "assistant", content: "Page summary: <summary>" }
              ],
              stop_sequences: ["</summary>"],
              model: modelToUse || "claude-3-5-haiku-latest",
              temperature: 0.7
            })
          });
          if (!response.ok) throw new Error(`Claude HTTP error! status: ${response.status}`);
          const data = await response.json();
          rawSummary = data.content[0].text || "No summary available.";
        } else if (llmToUse === 'deepseek') {

          // Call Deepseek API
          const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            mode: "cors", // explicitly enable cors, not the most secure option
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${usedKey}`,
              // "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({
              model: modelToUse || "deepseek-chat", // chat is v3
              messages: [
                { role: "system", content: forceHtmlPrompt },
                { role: "user", content: finalPrompt },
                { role: "user", content: pageText }
              ],
              temperature: 0.7,
            })
          })

          if (!response.ok) throw new Error(`DeepSeek HTTP error! status: ${response.status}`);
          const data = await response.json();
          rawSummary = data.choices?.[0]?.message?.content?.trim() || "No summary available.";
        } else {


          // Call OpenAI API
          const response = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${usedKey}`
            },
            body: JSON.stringify({
              model: modelToUse || "gpt-4o-mini",
              input: finalPrompt + forceHtmlPrompt + pageText
            })
          });

          if (!response.ok) throw new Error(`OpenAI HTTP error! status: ${response.status}`);
          const data = await response.json();

          rawSummary = data.output
            .filter(item => item.type === 'message' && item.role === 'assistant')
            .flatMap(item => item.content)
            .filter(content => content.type === 'output_text')
            .map(content => content.text)
            .join('\n')
            .trim() || "No summary available.";

        }

        // Render and cache the new summary
        try {
          summaryDiv.innerHTML = rawSummary;
        } catch (error) {
          console.error('Error parsing markdown:', error);
          summaryDiv.textContent = `there was an error with markdown parsing`; // Fallback to plain text if markdown parsing fails
        }

        // Remove any old entry for this URL
        const idx = summaries.findIndex(s => s.url === currentUrl);
        if (idx !== -1) {
          summaries.splice(idx, 1);
        }
        // Add the new result
        summaries.push({ url: currentUrl, summary: rawSummary, timestamp: Date.now() });
        if (summaries.length > 10) summaries.shift(); // keep only last 10

        await chrome.storage.local.set({ summaries });
      } catch (error) {
        summaryDiv.textContent = `Error: ${error.message}`;
      }
    });
  });