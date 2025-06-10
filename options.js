async function loadSettings() {
  const {
    openAiKey,
    claudeKey,
    deepSeekKey,
    summarizationPrompt
  } = await chrome.storage.sync.get([
    'openAiKey', 'claudeKey', 'deepSeekKey', 'summarizationPrompt'
  ]);

  // API secret keys
  document.getElementById('openAiKey').value = openAiKey || '';
  document.getElementById('claudeKey').value = claudeKey || '';
  document.getElementById('deepSeekKey').value = deepSeekKey || '';

  // Prompt
  document.getElementById('summarizationPrompt').value = summarizationPrompt || 'Summarize the following text:';
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();

  // Save button
  document.getElementById('saveBtn').addEventListener('click', async () => {
    const openAiKey = document.getElementById('openAiKey').value.trim();
    const claudeKey = document.getElementById('claudeKey').value.trim();
    const deepSeekKey = document.getElementById('deepSeekKey').value.trim();
    const summarizationPrompt = document.getElementById('summarizationPrompt').value.trim();

    await chrome.storage.sync.set({
      openAiKey,
      claudeKey,
      deepSeekKey,
      summarizationPrompt
    });
    alert('Settings saved.');
  });
});
