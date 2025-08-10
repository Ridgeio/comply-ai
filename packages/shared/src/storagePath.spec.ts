import { describe, it, expect } from 'vitest'
import { buildStoragePath } from './storagePath'

describe('buildStoragePath', () => {
  const baseParams = {
    orgId: '123e4567-e89b-12d3-a456-426614174000',
    txId: '987fcdeb-51a2-43f1-b123-556677889900',
    originalName: 'test.pdf'
  }

  it('should build deterministic path with injected date', () => {
    const now = new Date('2024-03-15T10:30:00Z')
    
    const path = buildStoragePath({
      ...baseParams,
      now
    })
    
    // Should include org, tx, date buckets, and sanitized filename
    expect(path).toMatch(/^transactions\/123e4567-e89b-12d3-a456-426614174000\/987fcdeb-51a2-43f1-b123-556677889900\/2024\/03\/15\/[a-f0-9-]+-test\.pdf$/)
  })

  it('should sanitize filenames with spaces and special characters', () => {
    const now = new Date('2024-03-15T10:30:00Z')
    
    const path = buildStoragePath({
      ...baseParams,
      originalName: 'Original NAME (1).PDF',
      now
    })
    
    expect(path).toMatch(/original-name-1\.pdf$/)
  })

  it('should handle unicode and multiple dots', () => {
    const now = new Date('2024-03-15T10:30:00Z')
    
    const path = buildStoragePath({
      ...baseParams,
      originalName: 'résumé.final.version.PDF',
      now
    })
    
    // Unicode gets stripped, so résumé becomes rsum
    expect(path).toMatch(/rsum\.final\.version\.pdf$/)
  })

  it('should add .pdf extension if missing', () => {
    const now = new Date('2024-03-15T10:30:00Z')
    
    const path1 = buildStoragePath({
      ...baseParams,
      originalName: 'document',
      now
    })
    
    expect(path1).toMatch(/document\.pdf$/)
    
    const path2 = buildStoragePath({
      ...baseParams,
      originalName: 'report.txt',
      now
    })
    
    expect(path2).toMatch(/report\.txt\.pdf$/)
  })

  it('should handle mixed case extensions', () => {
    const now = new Date('2024-03-15T10:30:00Z')
    
    const path = buildStoragePath({
      ...baseParams,
      originalName: 'Document.Pdf',
      now
    })
    
    expect(path).toMatch(/document\.pdf$/)
    expect(path).not.toMatch(/\.pdf\.pdf$/)
  })

  it('should strip dangerous characters', () => {
    const now = new Date('2024-03-15T10:30:00Z')
    
    const path = buildStoragePath({
      ...baseParams,
      originalName: '../../../etc/passwd.pdf',
      now
    })
    
    expect(path).not.toContain('..')
    // The full path will contain slashes, but the filename part shouldn't
    const filename = path.split('/').pop()
    expect(filename).not.toContain('/')
    expect(path).toMatch(/etcpasswd\.pdf$/)
  })

  it('should handle empty or invalid filenames', () => {
    const now = new Date('2024-03-15T10:30:00Z')
    
    const path1 = buildStoragePath({
      ...baseParams,
      originalName: '',
      now
    })
    
    expect(path1).toMatch(/document\.pdf$/)
    
    const path2 = buildStoragePath({
      ...baseParams,
      originalName: '!!!',
      now
    })
    
    expect(path2).toMatch(/document\.pdf$/)
  })

  it('should generate unique paths for same filename', () => {
    const now = new Date('2024-03-15T10:30:00Z')
    
    const path1 = buildStoragePath({
      ...baseParams,
      originalName: 'test.pdf',
      now
    })
    
    const path2 = buildStoragePath({
      ...baseParams,
      originalName: 'test.pdf',
      now
    })
    
    // Paths should be different due to UUID
    expect(path1).not.toEqual(path2)
    
    // But should have same structure
    const pattern = /^transactions\/123e4567-e89b-12d3-a456-426614174000\/987fcdeb-51a2-43f1-b123-556677889900\/2024\/03\/15\/[a-f0-9-]+-test\.pdf$/
    expect(path1).toMatch(pattern)
    expect(path2).toMatch(pattern)
  })

  it('should pad month and day with zeros', () => {
    const now = new Date('2024-01-05T10:30:00Z')
    
    const path = buildStoragePath({
      ...baseParams,
      originalName: 'test.pdf',
      now
    })
    
    expect(path).toContain('/2024/01/05/')
  })

  it('should use current date if not provided', () => {
    const path = buildStoragePath({
      ...baseParams,
      originalName: 'test.pdf'
    })
    
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    
    expect(path).toContain(`/${year}/${month}/${day}/`)
  })
})