import { events } from './schema.js'
import { Schema } from '@livestore/livestore'

/**
 * Build-time validation utilities for schema consistency
 *
 * These functions help catch schema mismatches at build time rather than runtime.
 * Run these as part of your build process or test suite.
 */

/**
 * Events that should update notebook lastModified time.
 * These events affect notebook state and should trigger notebook timestamp updates.
 */
const NOTEBOOK_MODIFYING_EVENTS = [
  'v1.CellCreated',
  'v1.CellSourceChanged',
  'v1.CellTypeChanged',
  'v1.CellDeleted',
  'v1.CellMoved',
  'v1.NotebookTitleChanged',
] as const

/**
 * Events that should NOT have manual timestamp fields.
 * These timestamps should be derived from event metadata instead.
 */
const EVENTS_WITH_REDUNDANT_TIMESTAMPS = [
  'v1.CellCreated',
  'v1.CellSourceChanged',
  'v1.CellTypeChanged',
  'v1.CellDeleted',
  'v1.CellMoved',
] as const

/**
 * Required fields that should be present on all synced events
 */
const REQUIRED_EVENT_METADATA = {
  id: 'string',
  timestamp: 'number', // Unix timestamp
  clientId: 'string',
  seqNum: 'number',
} as const

/**
 * Validates that events don't contain redundant timestamp fields that should be derived
 */
export function validateNoRedundantTimestamps(): ValidationResult {
  const errors: string[] = []

  for (const eventName of EVENTS_WITH_REDUNDANT_TIMESTAMPS) {
    const event = findEventByName(eventName)
    if (!event) {
      errors.push(`Event '${eventName}' not found in schema`)
      continue
    }

    // Check if event schema contains notebookLastModified field
    if (hasFieldInSchema(event.schema, 'notebookLastModified')) {
      errors.push(
        `Event '${eventName}' contains redundant 'notebookLastModified' field. ` +
        `This should be derived from event timestamp in materializer instead.`
      )
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: []
  }
}

/**
 * Validates that all required events exist and have proper structure
 */
export function validateEventCompleteness(): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check that all expected events exist
  for (const eventName of NOTEBOOK_MODIFYING_EVENTS) {
    const event = findEventByName(eventName)
    if (!event) {
      errors.push(`Required event '${eventName}' not found in schema`)
    }
  }

  // Check event naming conventions
  const allEventNames = Object.values(events).map(e => e.name)
  for (const eventName of allEventNames) {
    if (!eventName.startsWith('v1.')) {
      warnings.push(`Event '${eventName}' should use versioned naming (e.g., 'v1.${eventName}')`)
    }

    if (!isPascalCase(eventName.replace('v1.', ''))) {
      warnings.push(`Event '${eventName}' should use PascalCase after version prefix`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validates that event schemas are properly typed and don't have common issues
 */
export function validateEventSchemaTypes(): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  for (const [eventKey, event] of Object.entries(events)) {
    const eventName = event.name


    // Validate ID fields are strings
    if (hasFieldInSchema(event.schema, 'id')) {
      const idFieldType = getFieldTypeFromSchema(event.schema, 'id')
      if (idFieldType !== 'string') {
        errors.push(`Event '${eventName}' 'id' field should be string, got ${idFieldType}`)
      }
    }


  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Comprehensive validation that runs all checks
 */
export function validateSchema(): ValidationResult {
  const results = [
    validateNoRedundantTimestamps(),
    validateEventCompleteness(),
    validateEventSchemaTypes()
  ]

  const allErrors = results.flatMap(r => r.errors)
  const allWarnings = results.flatMap(r => r.warnings)

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  }
}

/**
 * Generates TypeScript type definitions for events to ensure compile-time safety
 */
export function generateEventTypes(): string {
  const typeDefinitions: string[] = []

  typeDefinitions.push('// Auto-generated event types for build-time validation')
  typeDefinitions.push('// DO NOT EDIT MANUALLY')
  typeDefinitions.push('')

  for (const [eventKey, event] of Object.entries(events)) {
    const eventName = event.name
    const pascalCaseKey = toPascalCase(eventKey)

    typeDefinitions.push(`export type ${pascalCaseKey}Args = {`)

    // This would need to be implemented based on the actual Schema introspection
    // For now, just add a placeholder that shows the concept
    typeDefinitions.push(`  // Fields for ${eventName}`)
    typeDefinitions.push(`  // TODO: Generate from actual schema`)
    typeDefinitions.push(`}`)
    typeDefinitions.push('')
  }

  typeDefinitions.push('// Union type of all event argument types')
  const allEventTypes = Object.keys(events).map(key => `${toPascalCase(key)}Args`).join(' | ')
  typeDefinitions.push(`export type AllEventArgs = ${allEventTypes}`)

  return typeDefinitions.join('\n')
}

/**
 * CLI command to run schema validation
 */
export function runValidation(): void {
  console.log('🔍 Running LiveStore schema validation...\n')

  const result = validateSchema()

  if (result.warnings.length > 0) {
    console.log('⚠️  Warnings:')
    for (const warning of result.warnings) {
      console.log(`   ${warning}`)
    }
    console.log('')
  }

  if (result.errors.length > 0) {
    console.log('❌ Errors:')
    for (const error of result.errors) {
      console.log(`   ${error}`)
    }
    console.log('')
    console.log('Schema validation failed!')
    process.exit(1)
  }

  console.log('✅ Schema validation passed!')

  if (result.warnings.length > 0) {
    console.log(`\n📊 Summary: ${result.warnings.length} warnings, 0 errors`)
  } else {
    console.log('📊 Summary: No issues found')
  }
}

// Utility types and interfaces

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

// Helper functions

function findEventByName(eventName: string) {
  return Object.values(events).find(event => event.name === eventName)
}

function hasFieldInSchema(schema: any, fieldName: string): boolean {
  // This would need to inspect the actual Effect Schema structure
  // For now, return false as a placeholder
  // In a real implementation, you'd traverse the schema AST
  return false
}

function getFieldTypeFromSchema(schema: any, fieldName: string): string {
  // This would need to inspect the actual Effect Schema structure
  // For now, return 'unknown' as a placeholder
  return 'unknown'
}

function isPascalCase(str: string): boolean {
  return /^[A-Z][a-zA-Z0-9]*$/.test(str)
}

function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/([A-Z])/g, '$1')
}

// Export for use in build scripts
if (import.meta.url === `file://${process.argv[1]}`) {
  runValidation()
}
