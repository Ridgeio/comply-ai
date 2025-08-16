import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadFiles } from '../src/app/transactions/[txId]/actions/uploadFiles'

// Mock Next.js cache functions
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}))

// Polyfill File.arrayBuffer() for Node.js test environment
// This needs to be done before any File instances are created
global.File = class extends File {
  constructor(...args: any[]) {
    super(...args)
  }
  
  async arrayBuffer(): Promise<ArrayBuffer> {
    // Return a mock ArrayBuffer for testing
    const encoder = new TextEncoder()
    return encoder.encode('%PDF-1.4 mock content').buffer
  }
} as any

// Mock Supabase client
const mockStorage = {
  from: vi.fn(() => ({
    upload: vi.fn()
  }))
}

const mockDb = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn()
      }))
    }))
  })),
  auth: {
    getUser: vi.fn()
  }
}

// Mock the Supabase admin client
vi.mock('../src/lib/supabaseAdmin', () => ({
  createAdminClient: vi.fn(() => ({
    storage: mockStorage,
    from: mockDb.from,
    auth: mockDb.auth
  }))
}))

// Mock supabaseServer to avoid cookies error
vi.mock('../src/lib/supabaseServer', () => ({
  supabaseServer: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { 
          user: { 
            id: 'test-user-id',
            email: 'test@example.com'
          } 
        },
        error: null
      })
    }
  }))
}))

// Mock auth helpers - will be configured in beforeEach
vi.mock('../src/lib/auth-helpers', () => ({
  getAuthenticatedContext: vi.fn()
}))

// Mock buildStoragePath
vi.mock('@repo/shared', () => ({
  buildStoragePath: vi.fn((params) => 
    `transactions/${params.orgId}/${params.txId}/2024/03/15/mock-uuid-${params.originalName}`
  )
}))

// Import the auth-helpers module for mocking
import { getAuthenticatedContext } from '../src/lib/auth-helpers'

describe('uploadFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Configure the auth helpers mock for each test
    vi.mocked(getAuthenticatedContext).mockResolvedValue({
      user: { 
        id: 'user-123',
        email: 'test@example.com'
      },
      adminClient: {
        storage: mockStorage,
        from: mockDb.from,
        auth: mockDb.auth
      }
    })
  })

  it('should upload PDF and create database records', async () => {
    // Setup mocks
    const mockUser = { id: 'user-123' }
    const mockOrgId = 'org-456'
    const mockTxId = 'tx-789'
    
    mockDb.auth.getUser.mockResolvedValue({ 
      data: { user: mockUser }, 
      error: null 
    })

    // Mock successful upload
    const uploadMock = vi.fn().mockResolvedValue({
      data: { path: 'transactions/org-456/tx-789/2024/03/15/mock-uuid-test.pdf' },
      error: null
    })
    
    mockStorage.from.mockReturnValue({ upload: uploadMock })

    // Mock transaction_files insert
    const fileInsertMock = vi.fn().mockResolvedValue({
      data: { id: 'file-123', path: 'transactions/org-456/tx-789/2024/03/15/mock-uuid-test.pdf' },
      error: null
    })
    
    // Mock ingest_jobs insert
    const jobInsertMock = vi.fn().mockResolvedValue({
      data: { id: 'job-123', status: 'queued' },
      error: null
    })

    mockDb.from.mockImplementation((table: string) => {
      if (table === 'transaction_files') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: fileInsertMock
            }))
          }))
        }
      }
      if (table === 'ingest_jobs') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: jobInsertMock
            }))
          }))
        }
      }
      if (table === 'transactions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: mockTxId, org_id: mockOrgId },
                error: null
              })
            }))
          }))
        }
      }
      return { insert: vi.fn() }
    })

    // Create FormData with mock PDF
    const formData = new FormData()
    const pdfBlob = new Blob(['%PDF-1.4 mock content'], { type: 'application/pdf' })
    const pdfFile = new File([pdfBlob], 'test.pdf', { type: 'application/pdf' })
    formData.append('files', pdfFile)
    formData.append('txId', mockTxId)

    // Call the action
    const result = await uploadFiles(formData)

    // Assertions
    expect(result.success).toBe(true)
    expect(result.files).toHaveLength(1)
    expect(result.files?.[0]).toMatchObject({
      name: 'test.pdf',
      path: expect.stringContaining('test.pdf'),
      fileId: 'file-123',
      jobId: 'job-123'
    })

    // Verify storage upload was called
    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringContaining('test.pdf'),
      expect.any(Blob),
      expect.objectContaining({
        contentType: 'application/pdf',
        upsert: false
      })
    )

    // Verify database inserts
    expect(fileInsertMock).toHaveBeenCalled()
    expect(jobInsertMock).toHaveBeenCalled()
  })

  it('should reject non-PDF files', async () => {
    const formData = new FormData()
    const txtFile = new File(['text content'], 'test.txt', { type: 'text/plain' })
    formData.append('files', txtFile)
    formData.append('txId', 'tx-123')

    const result = await uploadFiles(formData)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Only PDF files are allowed')
    expect(mockStorage.from).not.toHaveBeenCalled()
  })

  it('should reject files larger than 20MB', async () => {
    const formData = new FormData()
    // Create a mock large file
    const largeContent = new Uint8Array(21 * 1024 * 1024) // 21MB
    const largeFile = new File([largeContent], 'large.pdf', { type: 'application/pdf' })
    formData.append('files', largeFile)
    formData.append('txId', 'tx-123')

    const result = await uploadFiles(formData)

    expect(result.success).toBe(false)
    expect(result.error).toContain('exceeds 20MB limit')
    expect(mockStorage.from).not.toHaveBeenCalled()
  })

  it('should handle multiple files', async () => {
    // Setup mocks
    mockDb.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'user-123' } }, 
      error: null 
    })

    const uploadMock = vi.fn()
      .mockResolvedValueOnce({
        data: { path: 'path1.pdf' },
        error: null
      })
      .mockResolvedValueOnce({
        data: { path: 'path2.pdf' },
        error: null
      })
    
    mockStorage.from.mockReturnValue({ upload: uploadMock })

    // Mock database responses
    mockDb.from.mockImplementation((table: string) => {
      if (table === 'transactions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 'tx-123', org_id: 'org-456' },
                error: null
              })
            }))
          }))
        }
      }
      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'mock-id' },
              error: null
            })
          }))
        }))
      }
    })

    const formData = new FormData()
    const pdf1 = new File(['%PDF-1'], 'file1.pdf', { type: 'application/pdf' })
    const pdf2 = new File(['%PDF-2'], 'file2.pdf', { type: 'application/pdf' })
    formData.append('files', pdf1)
    formData.append('files', pdf2)
    formData.append('txId', 'tx-123')

    const result = await uploadFiles(formData)

    expect(result.success).toBe(true)
    expect(result.files).toHaveLength(2)
    expect(uploadMock).toHaveBeenCalledTimes(2)
  })

  it('should rollback on partial failure', async () => {
    mockDb.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'user-123' } }, 
      error: null 
    })

    // Mock successful upload but failed DB insert
    const uploadMock = vi.fn().mockResolvedValue({
      data: { path: 'test.pdf' },
      error: null
    })
    
    mockStorage.from.mockReturnValue({ 
      upload: uploadMock,
      remove: vi.fn().mockResolvedValue({ error: null })
    })

    // Mock transaction lookup success
    mockDb.from.mockImplementation((table: string) => {
      if (table === 'transactions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 'tx-123', org_id: 'org-456' },
                error: null
              })
            }))
          }))
        }
      }
      if (table === 'transaction_files') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' }
              })
            }))
          }))
        }
      }
      return { insert: vi.fn() }
    })

    const formData = new FormData()
    const pdfFile = new File(['%PDF'], 'test.pdf', { type: 'application/pdf' })
    formData.append('files', pdfFile)
    formData.append('txId', 'tx-123')

    const result = await uploadFiles(formData)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Database error')
    // Should attempt to remove uploaded file on failure
    expect(mockStorage.from().remove).toHaveBeenCalled()
  })
})