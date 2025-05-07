// Model presets for each LLM
const MODEL_OPTIONS = {
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (default). In:$0.15. Out:$0.60.' },
    { value: 'o4-mini', label: '04-mini. In:$1.10. Out:$4.40.' },
    { value: 'o3-mini', label: 'o3-mini. In:$1.10. Out:$4.40.' },
    { value: 'gpt-4o', label: 'GPT-4o. In:$2.50. Out:$10.00.' },
    { value: 'o3', label: 'o3. In:$10.00. Out:$40.00.' },
  ],
  claude: [
    { value: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku (default)' },
    { value: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet' },
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

  const DEFAULT_LLM = LlmOpenAi // can be changed to DeepSeek/Claude
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

test('updates model options for OpenAI', () => {
    updateModelOptions(LlmOpenAi);
    const modelSelect = document.getElementById('modelSelect');
    expect(modelSelect.options.length).toBe(MODEL_OPTIONS[LlmOpenAi].length);
    expect(document.getElementById('openai-secret-input').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('claude-secret-input').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('deepseek-secret-input').classList.contains('hidden')).toBe(true);
  });
