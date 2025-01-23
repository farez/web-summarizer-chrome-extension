document.addEventListener("DOMContentLoaded", async () => {
    const summaryDiv = document.getElementById("summary");
    const cachedMsgDiv = document.getElementById("cachedMsg");
    const summarizeBtn = document.getElementById("summarizeBtn");

    // Get the current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tab.url;

    // Load cached summaries
    const { summaries = [] } = await chrome.storage.local.get("summaries");
    const existing = summaries.find(s => s.url === currentUrl);

    // Show cached summary if present
    if (existing) {
      cachedMsgDiv.textContent = "Showing previously generated summary";
      summaryDiv.innerHTML = marked.parse(existing.summary);
    } else {
      cachedMsgDiv.textContent = "No cached summary for this page.";
      summaryDiv.textContent = "";
    }

    summarizeBtn.addEventListener("click", async () => {
      summaryDiv.textContent = "Summarizing...";
      cachedMsgDiv.textContent = "";

      // Get the page text
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.body.innerText
      });
      const pageText = results[0].result || "";

      // Get user settings from storage
      const {
        llm,
        model,
        openAiKey,
        claudeKey,
        summarizationPrompt
      } = await chrome.storage.sync.get(["llm", "model", "openAiKey", "claudeKey", "summarizationPrompt"]);

      // Determine which key to use
      let usedKey;
      if (llm === "claude") {
        usedKey = claudeKey;
      } else {
        usedKey = openAiKey;
      }

      if (!usedKey) {
        summaryDiv.textContent = `Please set your ${llm} API key in extension options.`;
        return;
      }

      try {
        let rawSummary;

        if (llm === "claude") {
          // --- Call Claude (Anthropic) ---
          const claudePrompt = `Human: ${summarizationPrompt || "Summarize the following text:"}\n${pageText}\n\nAssistant:`;
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
              system: "You are a helpful assistant that summarizes web pages into a concise and informative summary. You are to return the summary in markdown format.",
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
        } else {
        // Call OpenAI
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${usedKey}`
          },
          body: JSON.stringify({
            model: model || "gpt-4o-mini",
            messages: [
              { role: "system", content: summarizationPrompt || "Summarize the following text and return the summary in markdown format:" },
              { role: "user", content: pageText }
            ]
          })
        });

        if (!response.ok) throw new Error(`OpenAI HTTP error! status: ${response.status}`);
        const data = await response.json();
        rawSummary = data.choices?.[0]?.message?.content?.trim() || "No summary available.";
      }

        // Render and cache the new summary
        summaryDiv.innerHTML = marked.parse(rawSummary);

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
