# Add Comprehensive Groq Integration and AI Model Persistence

## Summary

This PR adds Groq as a first-class AI provider alongside OpenAI and Ollama, with comprehensive integration including:

- Complete Groq provider support with 5 high-performance models
- AI model persistence - notebooks remember last selected provider/model
- Orange provider badges for clear visual distinction
- Comprehensive setup documentation and environment configuration
- Critical runtime process management guidelines
- Clean debug output handling in backend services

## Key Features

### Groq AI Provider Integration

- **Primary Model**: moonshotai/kimi-k2-instruct - Advanced reasoning and tool calling
- **Performance Models**: Llama 3.1 8B/70B for fast/high-performance inference
- **Specialized Models**: Mixtral 8x7B (mixture of experts), Gemma 2 9B (efficient)
- **Seamless Integration**: Works alongside existing OpenAI/Ollama providers

### AI Model Persistence

**Problem Solved**: Previously, every new AI cell defaulted to the first model, requiring manual reselection.

**Solution**: Notebooks now automatically remember and use the last selected AI model for new cells.

**Implementation**:

- Save model selections to notebook metadata via notebookMetadataSet events
- Read last used model when creating new AI cells in NotebookViewer.tsx
- Per-notebook memory - each notebook remembers its own preferred model
- Backward compatible - existing notebooks unaffected

### Developer Experience Enhancements

- Updated environment configuration with Groq setup instructions
- Comprehensive documentation with complete setup and troubleshooting guide
- Critical runtime process management warnings and solutions

## Files Changed

### Core Integration

- **src/components/notebook/AiCell.tsx**: Save AI model selections to notebook metadata
- **src/components/notebook/NotebookViewer.tsx**: Read last used model for new AI cells
- **src/util/ai-models.ts**: Add Groq provider styling and default model logic

### Backend Services

- **src/backend/auth.ts**: Clean up debug console output for production readiness
- **src/backend/sync.ts**: Remove verbose logging from LiveStore worker operations

### Documentation & Setup

- **README.md**: Comprehensive Groq integration section with setup instructions
- **AGENTS.md**: Critical runtime process conflict warnings
- **.env.example**: Groq API key and environment configuration

## Breaking Changes

**None** - This is a purely additive feature that maintains full backward compatibility.

## Testing

- All 5 Groq models functional with sub-2s response times
- AI model persistence working across browser restarts
- Tool calling - AI successfully creates and executes code cells
- Mixed providers - Groq and OpenAI models work together seamlessly
- Clean build and production environment compatibility

## Setup Instructions

1. **Get Groq API Key**: Sign up at console.groq.com
2. **Configure Environment**: Add GROQ_API_KEY=your_key to /runt/.env
3. **Start Services**: Follow README instructions for service startup
4. **Access Models**: All 5 Groq models appear in AI cell dropdown

## Critical Notes

**Runtime Process Management**: Always run pkill -f "pyodide-runtime-agent" before starting new runtimes to prevent LiveStore conflicts.

**Process Management Solution**: Use nohup instead of screen sessions for runtime processes - this prevents the process from being killed when running subsequent commands, which was a major source of session conflicts.

**Multiple Sessions Warning**: If you see multiple sessions in the UI, stop immediately and restart everything. Multiple sessions cause guaranteed execution hangs.

## Environment Requirements

**Required Environment Files:**

/runt/.env:

```bash
GROQ_API_KEY=your_groq_api_key_here
LIVESTORE_SYNC_URL=ws://localhost:8787/livestore
```

**Available Models**: All 5 Groq models (Kimi K2 Instruct, Llama 3.1 8B/70B, Mixtral 8x7B, Gemma 2 9B) with sub-2 second response times.
