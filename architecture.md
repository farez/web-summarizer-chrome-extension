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
- Manages API keys for different LLM providers
- Sets default LLM provider and model selection
- Configures default summarization prompt

## Key Features

### Model Selection
- **Settings Level**: Users set a default LLM (OpenAI/Claude/DeepSeek) and model in options
- **Popup Level**: Users can override the model selection per-summary using the dropdown in the popup
- **Universal Model Dropdown**: Shows all models from all LLM providers grouped by provider, allowing users to switch both model and LLM provider directly from the popup
- Model options are dynamically populated with all available models organized by provider (OpenAI, Claude, DeepSeek)

### Available Models
- **OpenAI**: GPT-4o Mini, o4-mini, o3-mini, GPT-4o, o3
- **Claude**: Haiku 3.5, Sonnet 3.7, Sonnet 4, Opus 4  
- **DeepSeek**: V3, R1

### Data Flow
1. User opens popup → loads settings from chrome.storage.sync
2. Popup populates model override dropdown with all models from all LLMs grouped by provider
3. User optionally selects different model (which may be from a different LLM) or uses default
4. On summarize → parses selected override to determine LLM and model, uses appropriate API key, falls back to settings if no override
5. Summary cached in chrome.storage.local with URL key

## Storage
- **chrome.storage.sync**: User settings (API keys, default LLM/model, prompt)
- **chrome.storage.local**: Cached summaries (max 10, FIFO) 
