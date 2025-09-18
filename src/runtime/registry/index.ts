/**
 * Runtime Registry System
 *
 * Complete runtime registry system for managing local and remote runtimes.
 * Provides type-safe interfaces, base classes, and React integration.
 */

// Core types and interfaces
export type {
  Runtime,
  LocalRuntime,
  RemoteRuntime,
  RuntimeRegistry as RuntimeRegistryInterface,
  RuntimeFactory as RuntimeFactoryInterface,
  RuntimeType,
  RuntimeStatus,
  RuntimeState,
  RuntimeMetadata,
  RuntimeCapabilities,
  RuntimeConfiguration,
  RuntimeRegistryConfig,
  RuntimeEvent,
  RemoteRuntimeConnection,
} from "./types.js";

// Base runtime implementation
export { BaseRuntime } from "./BaseRuntime.js";

// Specific runtime implementations
export { HtmlRuntime } from "./HtmlRuntime.js";
export type { HtmlRuntimeConfig } from "./HtmlRuntime.js";

// Core registry
export { RuntimeRegistry, getRuntimeRegistry } from "./RuntimeRegistry.js";

// React integration
export {
  RuntimeRegistryProvider,
  useRuntimeRegistry,
  useRuntimeState,
  useRuntimesByType,
  useActiveRuntimeOfType,
  useRuntimeOperations,
} from "./RuntimeRegistryProvider.js";

// Runtime registry wrapper for backwards compatibility
export {
  RuntimeRegistryWrapper,
  HtmlRuntimeManagerV2,
} from "./RuntimeRegistryWrapper.js";

// Compatibility hooks for legacy useHtmlRuntime interface
export {
  useHtmlRuntime,
  useHtmlRuntimeWithNotebook,
} from "./useHtmlRuntimeCompat.js";
export type {
  HtmlRuntimeState,
  HtmlRuntimeContextType,
} from "./useHtmlRuntimeCompat.js";

// Factory system
export { RuntimeFactory, createRuntimeFactory } from "./RuntimeFactory.js";
export type { RuntimeFactoryConfig } from "./RuntimeFactory.js";

// Convenience re-exports for common patterns
// Convenience re-exports for common patterns
export { RuntimeRegistry as Registry } from "./RuntimeRegistry.js";
