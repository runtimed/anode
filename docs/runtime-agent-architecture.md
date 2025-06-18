# Runtime Agent Architecture

The **Runtime Agent** is the core execution environment in Anode that serves a dual purpose: it's both a system agent that manages computational resources and an AI agent that provides intelligent assistance within the notebook context.

## Conceptual Overview

The Runtime Agent embodies a dual meaning that captures what we're building:

### System Agent
Runs as a separate process that manages:
- **Python kernel execution** via Pyodide or classic Jupyter Kernels with ZeroMQ
- **LiveStore sync** for real-time collaboration with scoped actions
- **Database connections** (Postgres, SQL Server, etc.)
- **Document state management**

### AI Agent
Integration with foundational providers (OpenAI, Anthropic, etc.) and local models live here, not in the web client:
- **Full notebook context access** for better responses
- **Can execute code and see results** before responding
- **Tool calling** to create/modify cells and future actions

## Why This Architecture

This design provides several key advantages:

- **AI has full execution context** (variables, imports, previous outputs)
- **Database credentials stay server-side** and are masked from outputs
- **Python kernel and AI share the same container space**
- **Each notebook gets its own isolated runtime agent instance**

The web client stays lightweight - just UI and basic LiveStore sync. All the heavy lifting (Python, AI, databases) happens in the runtime agent.

## Architecture Principles

### Process Isolation
Each notebook gets its own runtime agent instance, providing:
- **Security isolation** between different notebooks
- **Resource management** with configurable limits per notebook
- **Failure isolation** - one notebook's issues don't affect others
- **Clean shutdown** without affecting other notebooks

### Context Completeness
The Runtime Agent sees the full picture:
- Source code from all cells
- Execution outputs (text, data, visualizations)
- Error traces and debugging information
- Variable state and import history
- User interactions and editing patterns

This complete context enables AI to provide much more relevant and accurate assistance than a web-based AI that only sees source code.

### Credential Security
Sensitive information stays server-side:
- Database connection strings never reach the browser
- API keys and tokens are masked in all outputs
- Query results are sanitized before display
- Audit logs track all credential usage

## Execution Backends

The Runtime Agent supports multiple Python execution environments:

### Pyodide (Current)
- **Isolation**: Browser-like WASM sandbox
- **Performance**: Good for most data science tasks
- **Startup**: Medium (~3-4 seconds with cache warming)
- **Packages**: Pure Python packages work well
- **Use case**: Development, prototyping, education

### Jupyter Kernels (Planned) 
- **Isolation**: Full CPython with process boundaries
- **Performance**: Native speed with C extensions
- **Startup**: Fast (~300ms) 
- **Packages**: Full ecosystem including compiled extensions
- **Use case**: Production workloads, heavy computation

This flexibility allows users to choose the right environment for their needs - from quick prototyping with Pyodide to production analysis with full Jupyter kernels.

## AI Integration Philosophy

### Context-Aware Intelligence
Unlike web-based AI assistants that only see code, the Runtime Agent's AI has access to:
- **Execution results** - what actually happened when code ran
- **Error context** - full stack traces and debugging information
- **Data insights** - actual DataFrame contents, plot outputs, statistical results
- **Workflow understanding** - how the analysis evolved over time

This enables AI to provide suggestions based on actual results rather than guessing from source code alone.

### Multiple Provider Support
The architecture supports various AI providers:
- **Foundation models**: OpenAI GPT-4, Anthropic Claude, etc.
- **Local models**: Ollama, LM Studio, custom deployments
- **Specialized models**: Code-specific, domain-specific assistants

Users can choose providers based on privacy needs, cost considerations, or specific capabilities.

### Tool Integration
AI can actively participate in notebook development:
- **Cell creation**: Add new code or markdown cells
- **Content modification**: Edit existing cells based on context
- **Code execution**: Run code to test hypotheses or gather data
- **Result analysis**: Examine outputs and suggest next steps

This transforms AI from a passive assistant to an active development partner.

## Database Integration Vision

### Seamless Data Access
Notebooks can connect to various data sources:
- **Relational databases**: PostgreSQL, SQL Server, MySQL
- **Cloud data warehouses**: Snowflake, BigQuery, Redshift  
- **APIs**: REST endpoints, GraphQL services
- **File systems**: S3, local files, network drives

### Credential Management
All database credentials are managed server-side:
- **Never exposed** to the web client or notebook outputs
- **Automatically masked** in logs and displays
- **Centrally managed** for team sharing and rotation
- **Audit tracked** for compliance and security

### Query Integration
SQL queries become first-class notebook citizens:
- **Syntax highlighting** and error detection
- **Auto-completion** based on schema introspection
- **Result caching** for performance
- **Visualization integration** with matplotlib, plotly, etc.

## Package Management

### Intelligent Caching
Runtime agents share package caches to reduce startup times:
- **Pre-warmed environments** with common packages (numpy, pandas, matplotlib)
- **Team-shared caches** for consistency across developers
- **Incremental updates** only download what's changed
- **Version management** ensures reproducible environments

### Environment Flexibility
Different notebooks can use different package versions:
- **Per-notebook environments** with isolated dependencies
- **Shared base environments** for common workflows
- **Custom environments** for specialized requirements
- **Version pinning** for reproducible research

## Lifecycle Management

### Current State: Manual
Today, users manually start runtime agents for each notebook:
```
NOTEBOOK_ID=notebook-abc-123 pnpm dev:runtime
```

This works for development but creates friction for users.

### Future Vision: Automated
Runtime agents should start automatically when needed:
- **On-demand provisioning** when notebook is opened
- **Auto-scaling** based on computational demands
- **Resource management** with configurable limits
- **Health monitoring** with automatic recovery

### Development Workflow
The typical development flow becomes:
1. **Open notebook** in web client
2. **Runtime auto-starts** in background (transparent to user)
3. **Collaborative editing** via LiveStore sync
4. **AI assistance** available immediately with full context
5. **Database queries** work seamlessly with masked credentials
6. **Package installation** happens automatically as needed

## Security Model

### Defense in Depth
Multiple layers of security protection:
- **Process isolation** between notebooks
- **Credential masking** in all outputs and logs
- **Network isolation** with controlled external access
- **Audit logging** for compliance and debugging

### Trust Boundaries
Clear separation of trusted and untrusted components:
- **Web client**: Untrusted, handles only UI and basic sync
- **Runtime agent**: Trusted, handles all sensitive operations
- **Database connections**: Isolated to runtime agent only
- **AI providers**: External, but requests go through runtime agent

### Performance Characteristics

### Startup Performance
- **Cold start**: Full initialization of all components (~3-4 seconds)
- **Warm start**: Reusing cached components (~1 second)
- **Hot start**: Already running runtime agent (~100ms)

### Resource Usage
- **Memory efficient**: Shared package caches reduce per-notebook overhead
- **CPU aware**: Configurable limits prevent resource exhaustion
- **Storage optimized**: Incremental package updates and result caching

### Scaling Properties
- **Horizontal scaling**: Multiple runtime agents per server
- **Vertical scaling**: Adjustable resource limits per agent
- **Load balancing**: Distribute notebooks across available agents

## Future Enhancements

### Advanced AI Capabilities
- **Multi-turn conversations** with persistent context
- **Code review** and quality suggestions
- **Automated documentation** generation
- **Debugging assistance** with error analysis

### Enhanced Database Features
- **Visual query builders** for complex queries
- **Schema exploration** with interactive tools
- **Data profiling** and quality assessment
- **Performance optimization** suggestions

### Container Integration
- **Docker support** for custom environments
- **Kubernetes deployment** for production scale
- **GPU support** for machine learning workloads
- **Custom base images** for specialized requirements

### Model Context Protocol (MCP)
Future integration with MCP could enable AI to use external tools like GitHub, file systems, and custom domain-specific tools.

## Implementation Status

### Working Today
- ✅ Basic Runtime Agent with Pyodide execution
- ✅ OpenAI integration with notebook context
- ✅ LiveStore sync for real-time collaboration
- ✅ Manual lifecycle management
- ✅ Package caching system

### In Development
- 🚧 Rich output verification and testing
- 🚧 AI tool calling infrastructure
- 🚧 Automated runtime management
- 🚧 Enhanced error handling and recovery

### Planned Features
- 📋 Jupyter kernel support with ZeroMQ
- 📋 Multiple AI provider integration
- 📋 Database connection management
- 📋 Container-based deployment options

## Design Philosophy

The Runtime Agent architecture embodies several key principles:

**Local-First**: Work offline, sync when connected. The runtime agent can operate independently of network connectivity.

**Context-Complete**: AI has access to the full execution context, not just source code, enabling much more intelligent assistance.

**Security-Conscious**: Sensitive data stays server-side, with automatic masking and audit trails.

**Collaboration-Native**: Built on LiveStore's event-sourcing foundation for seamless multi-user editing.

**Extensible**: Plugin architecture supports new execution backends, AI providers, and data sources.

**Developer-Friendly**: Simple development workflow with automated infrastructure management.

This architecture transforms notebooks from isolated documents into collaborative, AI-enhanced development environments that bridge the gap between exploration and production.