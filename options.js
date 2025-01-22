document.addEventListener('DOMContentLoaded', async () => {
    const { openAiKey, summarizationPrompt } = await chrome.storage.sync.get(["openAiKey", "summarizationPrompt"]);
    document.getElementById("openAiKey").value = openAiKey || '';
    document.getElementById("summarizationPrompt").value = summarizationPrompt || 'Summarize the following text:';
  });

  document.getElementById('saveBtn').addEventListener('click', async () => {
    const openAiKey = document.getElementById("openAiKey").value.trim();
    const summarizationPrompt = document.getElementById("summarizationPrompt").value.trim();
    await chrome.storage.sync.set({ openAiKey, summarizationPrompt });
    alert('Settings saved.');
  });
