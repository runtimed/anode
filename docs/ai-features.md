# OpenAI Integration

Anode now supports real OpenAI API integration for AI cells, providing powerful AI assistance directly in your notebooks.

## Setup

### 1. Get an OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-`)

### 2. Configure the API Key

Copy the example environment file and add your API key:

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:

```bash
# .env
OPENAI_API_KEY=sk-your-actual-api-key-here
```

The `.env` file contains all configuration needed for Anode, including sync URLs and kernel settings.

### 3. Start the Services

```bash
# Start web client and sync backend
pnpm dev

# In another terminal, get runtime command from notebook UI
# Get runtime command from notebook UI, then:
NOTEBOOK_ID=notebook-id-from-ui pnpm dev:runtime
```

You should see confirmation that OpenAI is configured:
```
🤖 AI cell support: enabled (OpenAI configured ✅)
```

**Important**: Always use the kernel command provided in the notebook UI to ensure proper notebook ID matching.

## Usage

### Creating AI Cells

1. In the Anode web interface, click the "+" button to add a new cell
2. Select "AI Cell" from the dropdown
3. Choose your provider (OpenAI) and model (gpt-4, gpt-3.5-turbo, etc.)
4. Type your prompt and press Ctrl+Enter to execute

### Available Models

- `gpt-4` - Most capable model (default)
- `gpt-3.5-turbo` - Faster and more cost-effective
- `gpt-4-turbo` - Latest GPT-4 with improved performance

### Example Prompts

```
Analyze this dataset and suggest visualizations
```

```
Explain the pandas DataFrame operations in the cell above
```

```
Generate Python code to create a scatter plot with matplotlib
```

```
Help me debug the error in my previous code cell
```

## Features

### Rich Output Rendering

AI responses are rendered as rich markdown with support for:
- **Code blocks** with syntax highlighting
- **Tables** and structured data
- **Mathematical equations** (LaTeX)
- **Links** and formatted text

### Context Awareness

AI cells have access to your notebook context and can:
- Reference previous code cells and their source code
- **Analyze cell outputs and execution results** 
- See text outputs, data visualizations, and error messages
- Suggest next steps based on actual execution results
- Debug errors with full traceback information
- Understand the current state of variables and data

The AI context includes:
- **Source code** from all previous cells
- **Text outputs** (stdout/stderr) from code execution
- **Rich outputs** like pandas DataFrames, matplotlib plots (as text representations)
- **Error information** including exception types, messages, and tracebacks
- **Execution state** to understand what has been run successfully

### Token Usage Tracking

Each AI response includes metadata about token usage:
- Prompt tokens
- Completion tokens  
- Total tokens

This information is logged for cost tracking.

## Configuration Options

### Custom System Prompts

You can customize the AI behavior by modifying the system prompt in `openai-client.ts`:

```typescript
const systemPrompt = 'You are a helpful data science assistant...';
```

### Model Parameters

Adjust model parameters for different use cases:

```typescript
await openaiClient.generateResponse(prompt, {
  model: 'gpt-4',
  maxTokens: 2000,        // Response length limit
  temperature: 0.7,       // Creativity (0-1)
  systemPrompt: '...'     // Custom instructions
});
```

## Troubleshooting

### Common Issues

**"OpenAI client not configured"**
- Check that `OPENAI_API_KEY` is set correctly in `.env`
- Restart the kernel service after updating the `.env` file

**"Invalid API key"**
- Verify your API key is correct
- Check that your OpenAI account has credits available
- Ensure the key hasn't expired

**"Rate limit exceeded"**
- You've hit OpenAI's rate limits
- Wait a moment and try again
- Consider upgrading your OpenAI plan

### Fallback to Mock Responses

If OpenAI is not configured, the system automatically falls back to mock responses for development:

```
🤖 AI cell support: enabled (mock responses only - set OPENAI_API_KEY for real AI ⚠️)
```

This allows you to develop and test AI cell functionality without an API key.

## Cost Management

### Monitoring Usage

Monitor your OpenAI usage at [OpenAI Usage Dashboard](https://platform.openai.com/usage).

### Cost-Saving Tips

1. **Use gpt-3.5-turbo** for simpler tasks
2. **Set lower maxTokens** limits to control response length
3. **Be specific** in prompts to get focused responses
4. **Cache responses** when appropriate

### Token Estimates

Approximate token costs:
- **gpt-3.5-turbo**: $0.002/1K tokens
- **gpt-4**: $0.03/1K tokens  
- **gpt-4-turbo**: $0.01/1K tokens

*Check OpenAI pricing for current rates*

## Security Best Practices

### API Key Protection

- **Never commit** API keys to version control (`.env` is in `.gitignore`)
- **Use the `.env` file** for local development
- **Rotate keys** regularly
- **Limit key permissions** if available

### Data Privacy

- Be mindful that prompts and notebook content are sent to OpenAI
- Avoid including sensitive data in AI cell prompts
- Review OpenAI's data usage policies

## Advanced Features

### Output Context Integration

**New Feature**: AI cells now have full visibility into cell outputs, not just source code.

When you execute code cells, their outputs become part of the AI context:

```python
# Cell 1
import pandas as pd
df = pd.DataFrame({'name': ['Alice', 'Bob'], 'age': [25, 30]})
print(f"Created DataFrame with {len(df)} rows")
df.head()
```

```
Output: Created DataFrame with 2 rows
   name  age
0  Alice   25
1   Bob   30
```

```python
# Cell 2 (AI Cell)
# Prompt: "Analyze the DataFrame and suggest visualizations"
# The AI can now see both the code AND the actual DataFrame output
```

The AI will receive context including:
- The source code that created the DataFrame
- The print statement output showing 2 rows
- The actual DataFrame display showing the data structure
- This enables much more accurate and relevant suggestions

### Streaming Responses (Future)

Support for streaming AI responses is implemented and ready for future UI integration:

```typescript
await openaiClient.generateStreamingResponse(prompt, {
  onChunk: (chunk) => console.log(chunk)
});
```

### Multiple Providers (Future)

The architecture supports multiple AI providers. Future versions may include:
- Anthropic Claude
- Local models via Ollama
- Azure OpenAI

## Development

### Testing

# Run the OpenAI integration tests:

```bash
# From project root:
pnpm test:kernel
```

### Adding Custom Features

The `openai-client.ts` module is designed for easy extension:

```typescript
// Add custom methods
async customAnalysis(data: any, options: any) {
  // Your custom OpenAI integration
}
```

## Support

For issues with:
- **Anode integration**: Create an issue in the Anode repository
- **OpenAI API**: Check [OpenAI Documentation](https://platform.openai.com/docs)
- **Billing/Account**: Contact OpenAI support

## What's Next

The OpenAI integration provides a solid foundation for AI-powered notebooks. Recent enhancements include:

✅ **Output Context Integration** - AI can now see cell outputs and execution results
✅ **Rich Error Context** - AI receives full traceback information for debugging
✅ **Execution State Awareness** - AI understands what code has been run and its results

Future enhancements will include:

- **AI Tool Calling** - Allow AI to create cells, modify content, and execute code
- **Context Visibility Controls** - Let users control what the AI can see
- Real-time streaming responses
- Multi-turn conversations
- Custom AI assistants
- **MCP Integration** - Model Context Protocol support for extensible AI tooling

Happy coding with AI! 🤖✨