import { randomUUID } from 'crypto'

export interface StoragePathParams {
  orgId: string
  txId: string
  originalName: string
  now?: Date
}

/**
 * Builds a deterministic and safe storage path for uploaded files
 * Format: transactions/{orgId}/{txId}/{yyyy}/{mm}/{dd}/{uuid}-{safeFileName}
 */
export function buildStoragePath(params: StoragePathParams): string {
  const { orgId, txId, originalName, now = new Date() } = params
  
  // Generate date buckets
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  
  // Sanitize filename
  const safeFileName = sanitizeFileName(originalName)
  
  // Generate unique identifier
  const uuid = randomUUID()
  
  // Build the complete path
  return `transactions/${orgId}/${txId}/${year}/${month}/${day}/${uuid}-${safeFileName}`
}

/**
 * Sanitizes a filename to be safe for storage
 * - Converts to lowercase
 * - Replaces spaces with hyphens
 * - Removes special characters except [a-z0-9.-_]
 * - Ensures .pdf extension
 */
function sanitizeFileName(originalName: string): string {
  // Handle empty or invalid input
  if (!originalName || typeof originalName !== 'string') {
    return 'document.pdf'
  }
  
  // Convert to lowercase and trim
  let name = originalName.toLowerCase().trim()
  
  // Remove path traversal attempts
  name = name.replace(/\.\./g, '')
  name = name.replace(/\//g, '')
  name = name.replace(/\\/g, '')
  
  // Replace spaces with hyphens
  name = name.replace(/\s+/g, '-')
  
  // Remove non-ASCII characters (including unicode)
  name = name.replace(/[^\x00-\x7F]/g, '')
  
  // Keep only safe characters: alphanumeric, dots, hyphens, underscores
  name = name.replace(/[^a-z0-9.\-_]/g, '')
  
  // Remove multiple consecutive dots or hyphens
  name = name.replace(/\.+/g, '.')
  name = name.replace(/-+/g, '-')
  
  // Remove leading/trailing dots and hyphens
  name = name.replace(/^[.-]+|[.-]+$/g, '')
  
  // If the name is now empty, use a default
  if (!name || name === '') {
    return 'document.pdf'
  }
  
  // Ensure .pdf extension
  if (!name.endsWith('.pdf')) {
    // Check if it already has .PDF (case insensitive)
    if (name.match(/\.pdf$/i)) {
      // Replace any case variation with lowercase
      name = name.replace(/\.pdf$/i, '.pdf')
    } else {
      // Add .pdf extension
      name = name + '.pdf'
    }
  }
  
  return name
}