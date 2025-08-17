export type FormsRegistry = Record<string, { 
  expected_version: string; 
  effective_date?: string | null;
}>;

/**
 * Check if a form version is outdated compared to the registry
 */
export function isOutdated(
  formVersion: string | undefined, 
  formCode: string, 
  registry: FormsRegistry
): boolean {
  const entry = registry[formCode];
  
  // If form not in registry, it's not considered outdated
  if (!entry) {
    return false;
  }
  
  // If no version provided, it's not outdated (missing is different from outdated)
  if (!formVersion) {
    return false;
  }
  
  // Check if version matches expected
  return formVersion !== entry.expected_version;
}

/**
 * Get the expected version for a form code
 */
export function getExpectedVersion(
  formCode: string, 
  registry: FormsRegistry
): string | undefined {
  return registry[formCode]?.expected_version;
}

/**
 * Get the effective date for a form code
 */
export function getEffectiveDate(
  formCode: string, 
  registry: FormsRegistry
): string | null | undefined {
  return registry[formCode]?.effective_date;
}

/**
 * Build registry from database rows
 */
export function buildRegistry(
  rows: Array<{
    form_code: string;
    expected_version: string;
    effective_date: string | null;
  }>
): FormsRegistry {
  return rows.reduce((acc, row) => {
    acc[row.form_code] = {
      expected_version: row.expected_version,
      effective_date: row.effective_date
    };
    return acc;
  }, {} as FormsRegistry);
}