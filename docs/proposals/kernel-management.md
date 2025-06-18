# Kernel Management Architecture Proposal

**Status**: Draft Proposal  
**Author**: Development Team  
**Date**: June 2025

## Overview

This document proposes an architecture for automated kernel management in Anode notebooks, eliminating the current manual kernel startup process and enabling scalable, distributed kernel execution on cloud infrastructure.

## Current State

### Manual Kernel Management
Users must manually start kernels for each notebook:

```bash
# Current manual process
NOTEBOOK_ID=notebook-1750103266697-6y9q7nvc0v4 pnpm dev:kernel
```

### Problems with Current Approach
- **User Friction**: Manual kernel startup for each notebook
- **Resource Management**: No automatic cleanup of idle kernels
- **Scalability**: Cannot handle multiple users or notebooks efficiently
- **GPU Access**: No mechanism for GPU resource allocation
- **Development Overhead**: Developers need to manage kernel lifecycle

## Goals

- **Zero-Configuration**: Notebooks automatically get kernel access
- **Resource Efficiency**: Automatic kernel lifecycle management
- **GPU Support**: Seamless access to GPU-accelerated compute
- **Multi-User**: Support concurrent users with resource isolation
- **Development Experience**: Remove kernel management from developer workflow

## Proposed Architecture

### Option 1: Morph Cloud Integration

**TBD - Anil to fill in details**

Morph Cloud provides on-demand kernel provisioning with GPU support:

```typescript
// Placeholder for Morph Cloud integration
interface MorphCloudKernel {
  // TBD: Define interface based on Morph Cloud capabilities
  notebookId: string;
  instanceType: "cpu" | "gpu-t4" | "gpu-a100";
  status: "starting" | "ready" | "busy" | "stopping";
  endpoint?: string;
}

class MorphCloudManager {
  async provisionKernel(notebookId: string, requirements?: KernelRequirements): Promise<MorphCloudKernel> {
    // TBD: Implement Morph Cloud provisioning
  }
  
  async terminateKernel(kernelId: string): Promise<void> {
    // TBD: Implement kernel cleanup
  }
}
```

**Open Questions for Morph Cloud:**
- How does kernel provisioning work?
- What's the startup time for new kernels?
- How are GPUs allocated and managed?
- What's the cost model?
- How does it integrate with our LiveStore sync backend?

### Option 2: Docker-Based Local Kernels

For development and self-hosted deployments:

```typescript
interface DockerKernelConfig {
  image: string;
  resources: {
    memory: string;
    cpu: string;
    gpu?: boolean;
  };
  environment: Record<string, string>;
  volumes: Array<{
    host: string;
    container: string;
  }>;
}

class DockerKernelManager {
  async startKernel(notebookId: string, config: DockerKernelConfig): Promise<DockerKernel> {
    const containerName = `anode-kernel-${notebookId}`;
    
    const dockerCommand = [
      'docker', 'run',
      '--name', containerName,
      '--memory', config.resources.memory,
      '--cpus', config.resources.cpu,
      ...(config.resources.gpu ? ['--gpus', 'all'] : []),
      '-e', `NOTEBOOK_ID=${notebookId}`,
      '-e', `LIVESTORE_SYNC_URL=${process.env.LIVESTORE_SYNC_URL}`,
      ...Object.entries(config.environment).flatMap(([k, v]) => ['-e', `${k}=${v}`]),
      config.image
    ];
    
    const process = spawn(dockerCommand[0], dockerCommand.slice(1));
    
    return new DockerKernel(containerName, process);
  }
  
  async stopKernel(kernelId: string): Promise<void> {
    await exec(`docker stop ${kernelId}`);
    await exec(`docker rm ${kernelId}`);
  }
}
```

### Option 3: Process-Based Local Kernels

Simplest option for development:

```typescript
class ProcessKernelManager {
  private kernels = new Map<string, ChildProcess>();
  
  async startKernel(notebookId: string): Promise<ProcessKernel> {
    const kernelProcess = spawn('pnpm', ['dev:kernel'], {
      env: {
        ...process.env,
        NOTEBOOK_ID: notebookId,
      },
      cwd: this.projectRoot,
    });
    
    this.kernels.set(notebookId, kernelProcess);
    
    return new ProcessKernel(notebookId, kernelProcess);
  }
  
  async stopKernel(notebookId: string): Promise<void> {
    const process = this.kernels.get(notebookId);
    if (process) {
      process.kill('SIGTERM');
      this.kernels.delete(notebookId);
    }
  }
}
```

## Kernel Lifecycle Management

### Automatic Provisioning

```typescript
interface KernelRequirements {
  python_version?: string;
  packages?: string[];
  gpu?: boolean;
  memory?: string;
  timeout?: number;
}

class KernelManager {
  async getOrCreateKernel(notebookId: string, requirements?: KernelRequirements): Promise<Kernel> {
    // Check if kernel already exists and is healthy
    const existing = await this.getKernelStatus(notebookId);
    if (existing?.status === 'ready') {
      return existing;
    }
    
    // Provision new kernel
    const kernel = await this.provisionKernel(notebookId, requirements);
    
    // Wait for kernel to be ready
    await this.waitForKernelReady(kernel, { timeout: 30000 });
    
    return kernel;
  }
  
  private async waitForKernelReady(kernel: Kernel, options: { timeout: number }): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < options.timeout) {
      const status = await kernel.getStatus();
      if (status === 'ready') return;
      
      if (status === 'error') {
        throw new Error('Kernel failed to start');
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Kernel startup timeout');
  }
}
```

### Idle Cleanup

```typescript
class KernelReaper {
  private readonly IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  
  async cleanupIdleKernels(): Promise<void> {
    const allKernels = await this.kernelManager.listKernels();
    
    for (const kernel of allKernels) {
      const lastActivity = await this.getLastActivity(kernel.notebookId);
      const idleTime = Date.now() - lastActivity;
      
      if (idleTime > this.IDLE_TIMEOUT) {
        console.log(`Cleaning up idle kernel: ${kernel.notebookId}`);
        await this.kernelManager.terminateKernel(kernel.id);
      }
    }
  }
  
  private async getLastActivity(notebookId: string): Promise<number> {
    // Check LiveStore for last execution event
    const query = queryDb(
      tables.executionQueue
        .select('timestamp')
        .where({ cellId: { $like: `${notebookId}%` } })
        .orderBy('timestamp', 'desc')
        .limit(1)
    );
    
    const result = await this.store.query(query);
    return result[0]?.timestamp || 0;
  }
}
```

## Integration with Web Client

### Kernel Status UI

```typescript
// Show kernel status in notebook header
interface KernelStatusProps {
  notebookId: string;
}

export const KernelStatus: React.FC<KernelStatusProps> = ({ notebookId }) => {
  const [status, setStatus] = useState<KernelStatus>('unknown');
  
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const kernel = await kernelManager.getKernelStatus(notebookId);
        setStatus(kernel?.status || 'stopped');
      } catch (error) {
        setStatus('error');
      }
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [notebookId]);
  
  const statusColors = {
    starting: 'yellow',
    ready: 'green', 
    busy: 'blue',
    error: 'red',
    stopped: 'gray'
  };
  
  return (
    <Badge color={statusColors[status]}>
      Kernel: {status}
    </Badge>
  );
};
```

### Automatic Kernel Startup

```typescript
// Modify execution logic to auto-start kernels
const executeCell = useCallback(async () => {
  const sourceToExecute = localSource || cell.source;
  if (!sourceToExecute?.trim()) return;
  
  // Ensure kernel is available
  try {
    await kernelManager.getOrCreateKernel(notebookId);
  } catch (error) {
    console.error('Failed to start kernel:', error);
    // Show user-friendly error
    return;
  }
  
  // Proceed with normal execution
  store.commit(events.cellOutputsCleared({
    cellId: cell.id,
    clearedBy: 'current-user',
  }));
  
  const queueId = `exec-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const executionCount = (cell.executionCount || 0) + 1;
  
  store.commit(events.executionRequested({
    queueId,
    cellId: cell.id,
    executionCount,
    requestedBy: 'current-user',
    priority: 1,
  }));
}, [localSource, cell, notebookId, store]);
```

## Resource Management

### GPU Allocation

```typescript
interface GPURequirements {
  type: "t4" | "a100" | "v100";
  memory?: string;
  exclusive?: boolean;
}

class GPUManager {
  async allocateGPU(notebookId: string, requirements: GPURequirements): Promise<GPUAllocation> {
    // TBD: Implement GPU allocation logic
    // May vary significantly based on cloud provider (Morph Cloud, AWS, etc.)
  }
  
  async releaseGPU(allocationId: string): Promise<void> {
    // TBD: Release GPU resources
  }
}
```

### Cost Management

```typescript
interface UsageTracking {
  notebookId: string;
  kernelType: string;
  startTime: number;
  endTime?: number;
  computeUnits: number;
  cost?: number;
}

class CostTracker {
  async trackUsage(notebookId: string, event: 'start' | 'stop', kernelType: string): Promise<void> {
    // Track kernel usage for billing/optimization
  }
  
  async generateUsageReport(userId: string, period: { start: Date; end: Date }): Promise<UsageReport> {
    // Generate usage and cost reports
  }
}
```

## Security Considerations

### Kernel Isolation

```typescript
interface SecurityConfig {
  networkAccess: "none" | "limited" | "full";
  fileSystemAccess: "none" | "readonly" | "readwrite";
  maxMemory: string;
  maxCPU: string;
  allowedPackages?: string[];
  blockedDomains?: string[];
}

class KernelSecurityManager {
  async createSecureKernel(notebookId: string, config: SecurityConfig): Promise<SecureKernel> {
    // Implement security constraints based on configuration
  }
}
```

### Multi-Tenancy

```typescript
class TenantManager {
  async getKernelLimits(userId: string): Promise<KernelLimits> {
    // Return per-user kernel limits (CPU, memory, GPU, concurrent kernels)
  }
  
  async enforceQuotas(userId: string, request: KernelRequest): Promise<boolean> {
    // Check if user is within quotas before starting kernel
  }
}
```

## Implementation Plan

### Phase 1: Basic Automation (2 weeks)
- [ ] Implement ProcessKernelManager for local development
- [ ] Add automatic kernel startup to web client
- [ ] Create kernel status UI components
- [ ] Basic idle timeout and cleanup

### Phase 2: Cloud Integration (TBD - depends on Morph Cloud)
- [ ] Integrate with Morph Cloud (or chosen cloud provider)
- [ ] Implement GPU allocation and management
- [ ] Add resource monitoring and logging
- [ ] Cost tracking and reporting

### Phase 3: Production Features (2 weeks)
- [ ] Security and isolation implementation
- [ ] Multi-user quotas and limits
- [ ] Kernel health monitoring and auto-restart
- [ ] Performance optimization

### Phase 4: Advanced Features (1 week)
- [ ] Kernel sharing between notebooks
- [ ] Custom kernel images and environments
- [ ] Advanced resource scheduling
- [ ] Integration with CI/CD pipelines

## Open Questions

### Cloud Provider Integration
- **Q**: What are Morph Cloud's specific capabilities and APIs?
- **Q**: How do we handle authentication and billing integration?
- **Q**: What's the kernel startup time and how do we optimize it?

### Resource Management
- **Q**: How to handle kernel resource limits and quotas?
- **Q**: Should kernels be shared between notebooks or always isolated?
- **Q**: How to optimize for cost vs performance?

### Development Experience
- **Q**: How to provide local development that mirrors cloud behavior?
- **Q**: How to handle kernel debugging and logging?
- **Q**: Should there be different kernel types for different use cases?

### Scaling and Performance
- **Q**: How many concurrent kernels can we support?
- **Q**: How to handle kernel startup latency?
- **Q**: Should we implement kernel pooling or pre-warming?

## Success Metrics

- **Zero Manual Intervention**: Users never need to manually start kernels
- **Fast Startup**: Kernels ready within 10 seconds for CPU, 30 seconds for GPU
- **Resource Efficiency**: Idle kernels cleaned up within 30 minutes
- **Reliability**: 99%+ kernel startup success rate
- **Cost Optimization**: Efficient resource utilization with minimal waste

## Related Technologies

- **Jupyter Hub**: Multi-user Jupyter environments
- **Binder**: On-demand notebook environments  
- **Google Colab**: Cloud-based notebook kernels
- **Docker**: Container-based isolation
- **Kubernetes**: Container orchestration for scale

---

**Next Steps**: 
1. **Anil to complete Morph Cloud integration details**
2. Begin Phase 1 implementation with local process management
3. Design cloud integration architecture based on chosen provider
4. Prototype kernel lifecycle management with real notebooks