export { sum } from './math'
export { checkSupabaseEnv, getServiceRoleKey, type SupabaseEnvConfig } from './supabaseEnv'
export { buildStoragePath, type StoragePathParams } from './storagePath'
export { createClient, createAdminClient } from './supabase/server'

// Schemas
export {
  MoneyCents,
  IsoDate,
  Address,
  SalesPrice,
  FinancingType,
  Trec20,
  TransactionBundle,
  type Trec20 as Trec20Type,
  type TransactionBundle as TransactionBundleType
} from './schemas/trec'

// Money utilities
export { parseCurrencyToCents } from './money'

// Mappers
export { fromRawTrec20 } from './mappers/trec20'

// Rule Engine
export { runRules } from './rules/engine'
export { trec20Rules } from './rules/rules-trec20'
export { buildRegistry } from './rules/formsRegistry'
export type { Issue, Severity, Rule } from './rules/types'

// AI Analysis
export { analyzeSpecialProvisions } from './ai/specialProvisions'
export { MockLLM, type LlmProvider, type LlmResponse } from './ai/provider'

// Test utilities
export { makeTrec20 } from './test/factories'

// Audit
export { createAuditLog, createReportAuditLog, createRuleAuditLog } from './audit/audit'
export type { AuditAction, AuditTargetType, AuditLogEntry, AuditLogResult } from './audit/audit'