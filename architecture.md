# Page Summarizer Extension Architecture

## Core Files

### popup.html & popup.js
- Main extension interface that users interact with
- Contains summarization button, model override dropdown, and custom prompt toggle
- **Model Override Feature**: Added dropdown above "Instructions for Summarizer" that allows users to select a different model than their settings default
- Handles API calls to OpenAI, Claude, and DeepSeek
- Manages local storage for cached summaries

### options.html & options.js  
- Extension settings page
- Manages API keys for different LLM providers (OpenAI, Claude, DeepSeek)
- Configures default summarization prompt
- **Note**: LLM and model selection removed from options page since this is now handled exclusively in the popup

## Key Features

### Model Selection
- **Popup Level**: Users can select any model from any LLM provider, which becomes the new default
- **Persistent Default**: Selected model is automatically saved and becomes the default for all future summarizations
- **Universal Model Dropdown**: Shows all models from all LLM providers grouped by provider
- **Fallback Default**: If no saved default found, uses OpenAI o4-mini as the initial default

### Available Models
- **OpenAI**: GPT-4o Mini, GPT-4.1 Mini, GPT-4.1 Nano, GPT-4o, GPT-4.1, o3, o3-mini, o4-mini
- **Claude**: Haiku 3.5, Sonnet 3.7, Sonnet 4, Opus 4  
- **DeepSeek**: V3, R1

### Data Flow
1. User opens popup → loads default model from chrome.storage.sync (or uses o4-mini fallback)
2. Popup shows current default model as selected in dropdown
3. User can change model selection → automatically saves as new default
4. On summarize → uses currently selected model from dropdown
5. Summary cached in chrome.storage.local with URL key

## Storage
- **chrome.storage.sync**: User settings (API keys, prompt), persistent default model selection
- **chrome.storage.local**: Cached summaries (max 10, FIFO) 
