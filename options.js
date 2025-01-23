// Model presets for each LLM
const MODEL_OPTIONS = {
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (default)' },
    { value: 'gpt-4o', label: 'GPT-4o' },
  ],
  claude: [
    { value: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku (default)' },
    { value: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-haiku-latest', label: 'Claude 3 Haiku' },
    { value: 'claude-3-sonnet-latest', label: 'Claude 3 Sonnet' },
  ]
};

async function loadSettings() {
  const {
    llm,
    model,
    openAiKey,
    claudeKey,
    summarizationPrompt
  } = await chrome.storage.sync.get([
    'llm', 'model', 'openAiKey', 'claudeKey', 'summarizationPrompt'
  ]);

  // Set LLM dropdown
  const llmSelect = document.getElementById('llmSelect');
  llmSelect.value = llm || 'openai';

  // Populate models for selected LLM
  updateModelOptions(llmSelect.value);
  const modelSelect = document.getElementById('modelSelect');
  modelSelect.value = model || (llmSelect.value === 'openai' ? 'gpt-4o-mini' : 'claude-instant-v1');

  // Keys
  document.getElementById('openAiKey').value = openAiKey || '';
  document.getElementById('claudeKey').value = claudeKey || '';

  // Prompt
  document.getElementById('summarizationPrompt').value = summarizationPrompt || 'Summarize the following text:';
}

function updateModelOptions(llmValue) {
  const modelSelect = document.getElementById('modelSelect');
  modelSelect.innerHTML = ''; // Clear existing

  const optionsForLLM = MODEL_OPTIONS[llmValue] || [];
  optionsForLLM.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m.value;
    opt.textContent = m.label;
    modelSelect.appendChild(opt);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();

  // When LLM changes, reload model dropdown
  document.getElementById('llmSelect').addEventListener('change', (e) => {
    updateModelOptions(e.target.value);
  });

  // Save button
  document.getElementById('saveBtn').addEventListener('click', async () => {
    const llm = document.getElementById('llmSelect').value;
    const model = document.getElementById('modelSelect').value;
    const openAiKey = document.getElementById('openAiKey').value.trim();
    const claudeKey = document.getElementById('claudeKey').value.trim();
    const summarizationPrompt = document.getElementById('summarizationPrompt').value.trim();

    await chrome.storage.sync.set({
      llm,
      model,
      openAiKey,
      claudeKey,
      summarizationPrompt
    });
    alert('Settings saved.');
  });
});
