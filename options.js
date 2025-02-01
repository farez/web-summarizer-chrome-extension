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
  ],
  deepseek: [
    { value: 'deepseek-chat', label: 'Deepseek V3' },
    { value: 'deepseek-reasoner', label: 'Deepseek R1' },
  ]
};

// constants
const LlmOpenAi = 'openai'
const LlmDeepseek = 'deepseek'
const LlmClaude = 'claude'
const ModelDeepSeekChat = 'deepseek-chat'
const ModelGpt4oMini = 'gpt-4o-mini'
const ModelClaudeInstant = 'claude-instant-v1'

async function loadSettings() {
  const {
    llm,
    model,
    openAiKey,
    claudeKey,
    deepSeekKey,
    summarizationPrompt
  } = await chrome.storage.sync.get([
    'llm', 'model', 'openAiKey', 'claudeKey', 'deepSeekKey', 'summarizationPrompt'
  ]);

  const DEFAULT_LLM = LlmDeepseek
  // Set LLM dropdown
  const llmSelect = document.getElementById('llmSelect');
  llmSelect.value = llm || DEFAULT_LLM;

  // Populate models for selected LLM
  updateModelOptions(llmSelect.value);
  const modelSelect = document.getElementById('modelSelect');
  let llmModelDefault = '';
  if (llmSelect.value === LlmOpenAi) llmModelDefault = ModelGpt4oMini;
  if (llmSelect.value === LlmClaude) llmModelDefault = ModelClaudeInstant;
  if (llmSelect.value === LlmDeepseek) llmModelDefault = ModelDeepSeekChat;
  modelSelect.value = model || llmModelDefault

  // API secret keys
  document.getElementById('openAiKey').value = openAiKey || '';
  document.getElementById('claudeKey').value = claudeKey || '';
  document.getElementById('deepSeekKey').value = deepSeekKey || '';

  // Prompt
  document.getElementById('summarizationPrompt').value = summarizationPrompt || 'Summarize the following text:';
}

function updateModelOptions(llmValue) {
  console.log(`llm selected >> ${llmValue}`)
  const modelSelect = document.getElementById('modelSelect');
  modelSelect.innerHTML = ''; // Clear existing
  // Hide/show API key inputs based on selected LLM
  document.getElementById('openai-secret-input').classList.toggle('hidden', llmValue !== LlmOpenAi);
  document.getElementById('claude-secret-input').classList.toggle('hidden', llmValue !== LlmClaude);
  document.getElementById('deepseek-secret-input').classList.toggle('hidden', llmValue !== LlmDeepseek);

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
    const deepSeekKey = document.getElementById('deepSeekKey').value.trim();
    const summarizationPrompt = document.getElementById('summarizationPrompt').value.trim();

    await chrome.storage.sync.set({
      llm,
      model,
      openAiKey,
      claudeKey,
      deepSeekKey,
      summarizationPrompt
    });
    alert('Settings saved.');
  });
});
