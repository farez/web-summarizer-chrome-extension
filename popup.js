// Runs as soon as popup loads
document.addEventListener("DOMContentLoaded", async () => {
    const summaryDiv = document.getElementById("summary");
    const cachedMsgDiv = document.getElementById("cachedMsg");
    const summarizeBtn = document.getElementById("summarizeBtn");

    // Find current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tab.url;

    // Check cached summaries
    const { summaries = [] } = await chrome.storage.local.get("summaries");
    const existing = summaries.find(s => s.url === currentUrl);

    // If we have a cached summary, show it right away
    if (existing) {
      cachedMsgDiv.textContent = "Showing cached summary:";
      summaryDiv.innerHTML = marked.parse(existing.summary);
    } else {
      cachedMsgDiv.textContent = "No cached summary for this page.";
      summaryDiv.textContent = "";
    }

    // Summarize button
    summarizeBtn.addEventListener("click", async () => {
      summaryDiv.textContent = "Summarizing...";
      cachedMsgDiv.textContent = "";

      // Get the page text
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.body.innerText
      });
      const pageText = results[0].result || "";

      // Fetch OpenAI settings
      const { openAiKey, summarizationPrompt } = await chrome.storage.sync.get([
        "openAiKey",
        "summarizationPrompt"
      ]);

      if (!openAiKey) {
        summaryDiv.textContent = "Please set your OpenAI key in extension options.";
        return;
      }

      try {
        const prompt = summarizationPrompt || "Summarize the following text by first telling me what this text is about and then a bullet list of the key points:";
        // Send request to OpenAI
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openAiKey}`
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: prompt },
              { role: "user", content: pageText }
            ]
          })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        const rawSummary = data?.choices?.[0]?.message?.content?.trim() || "No summary available.";

        // Display and cache new summary
        summaryDiv.innerHTML = marked.parse(rawSummary);

        // Update local storage (limit to last 10 summaries)
        summaries.push({ url: currentUrl, summary: rawSummary, timestamp: Date.now() });
        if (summaries.length > 10) summaries.shift();
        await chrome.storage.local.set({ summaries });
      } catch (error) {
        summaryDiv.textContent = `Error: ${error.message}`;
      }
    });
  });
