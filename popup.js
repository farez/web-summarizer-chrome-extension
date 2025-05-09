document.addEventListener("DOMContentLoaded", async () => {
    const summaryDiv = document.getElementById("summary");
    const cachedMsgDiv = document.getElementById("cachedMsg");
    const summarizeBtn = document.getElementById("summarizeBtn");
    const errorMessages = document.getElementById("error-messages");
    const togglePromptLink = document.getElementById('togglePrompt');
    const customPromptTextarea = document.getElementById('customPrompt');

    // Get user settings from storage
    const {
      llm,
      model,
      openAiKey,
      claudeKey,
      deepSeekKey,
      summarizationPrompt
    } = await chrome.storage.sync.get(["llm", "model", "openAiKey", "claudeKey", "deepSeekKey", "summarizationPrompt"]);

    // Disable summarize button if API key is not set for selected LLM
    if ((llm === 'openai' && !openAiKey) ||
        (llm === 'claude' && !claudeKey) ||
        (llm === 'deepseek' && !deepSeekKey)) {
      summarizeBtn.disabled = true;
      errorMessages.textContent = `Please set ${llm} API key in options first`;
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
    if (llm === 'openai') {
      modelSelectedSpan.textContent = `OpenAI / ${model}`;
    } else if (llm === 'claude') {
      modelSelectedSpan.textContent = `Claude / ${model}`;
    } else if (llm === 'deepseek') {
      modelSelectedSpan.textContent = `DeepSeek / ${model}`;
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

      // Determine which key to use
      let usedKey;
      if (llm === "claude") {
        usedKey = claudeKey;
      } else if (llm === "deepseek") {
        usedKey = deepSeekKey;
      } else {
        usedKey = openAiKey;
      }

      if (!usedKey) {
        summaryDiv.textContent = `Please set your ${llm} API key in extension options.`;
        return;
      }

      console.log('finalPrompt >> ', finalPrompt);

      try {
        let rawSummary;

        if (llm === "claude") {
          // --- Call Claude (Anthropic) ---
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
              model: model || "claude-3-5-haiku-latest",
              temperature: 0.7
            })
          });
          if (!response.ok) throw new Error(`Claude HTTP error! status: ${response.status}`);
          const data = await response.json();
          rawSummary = data.content[0].text || "No summary available.";
        } else if (llm === 'deepseek') {
          const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            mode: "cors", // explicitly enable cors, not the most secure option
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${usedKey}`,
              // "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({
              model: model || "deepseek-chat", // chat is v3
              messages: [
                { role: "system", content: "You are a helpful assistant that summarizes web pages into a concise and informative summary." + forceHtmlPrompt },
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
          // Call OpenAI
          const response = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${usedKey}`
            },
            body: JSON.stringify({
              model: model || "gpt-4o-mini",
              input: finalPrompt + forceHtmlPrompt + pageText
            })
          });

          if (!response.ok) throw new Error(`OpenAI HTTP error! status: ${response.status}`);
          const data = await response.json();

        // data.output format example:
        // [
        //     {
        //         "id": "msg_67b73f697ba4819183a15cc17d011509",
        //         "type": "message",
        //         "role": "assistant",
        //         "content": [
        //             {
        //                 "type": "output_text",
        //                 "text": "Under the soft glow of the moon, Luna the unicorn danced through fields of twinkling stardust, leaving trails of dreams for every child asleep.",
        //                 "annotations": []
        //             }
        //         ]
        //     }
        // ]

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
