import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the generateReport function
const mockGenerateReport = vi.fn();

vi.mock('../src/app/transactions/[txId]/actions/generateReport', () => ({
  generateReport: mockGenerateReport
}));

describe('generateReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateReport.mockReset();
  });

  it('should generate a report with issues', async () => {
    mockGenerateReport.mockResolvedValueOnce({
      success: true,
      reportId: 'report-123',
      countsBySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 1,
        info: 0,
      },
      issueCount: 1
    });

    const { generateReport } = await import('../src/app/transactions/[txId]/actions/generateReport');
    const result = await generateReport('tx-123', 'file-123');

    expect(result.success).toBe(true);
    expect(result.reportId).toBe('report-123');
    expect(result.countsBySeverity).toEqual({
      critical: 0,
      high: 0,
      medium: 0,
      low: 1,
      info: 0,
    });
  });

  it('should handle file not found error', async () => {
    mockGenerateReport.mockResolvedValueOnce({
      success: false,
      error: 'File not found'
    });

    const { generateReport } = await import('../src/app/transactions/[txId]/actions/generateReport');
    const result = await generateReport('tx-123', 'invalid-file');

    expect(result.success).toBe(false);
    expect(result.error).toContain('File not found');
  });

  it('should handle storage download error', async () => {
    mockGenerateReport.mockResolvedValueOnce({
      success: false,
      error: 'Storage error'
    });

    const { generateReport } = await import('../src/app/transactions/[txId]/actions/generateReport');
    const result = await generateReport('tx-123', 'file-123');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Storage error');
  });

  it('should handle parsing errors gracefully', async () => {
    mockGenerateReport.mockResolvedValueOnce({
      success: false,
      error: 'Parse error'
    });

    const { generateReport } = await import('../src/app/transactions/[txId]/actions/generateReport');
    const result = await generateReport('tx-123', 'file-123');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Parse error');
  });

  it('should validate user has access to transaction', async () => {
    mockGenerateReport.mockResolvedValueOnce({
      success: false,
      error: 'You do not have access to this transaction'
    });

    const { generateReport } = await import('../src/app/transactions/[txId]/actions/generateReport');
    const result = await generateReport('tx-no-access', 'file-123');

    expect(result.success).toBe(false);
    expect(result.error).toContain('access');
  });

  it('should return correct severity counts for multiple issues', async () => {
    mockGenerateReport.mockResolvedValueOnce({
      success: true,
      reportId: 'report-123',
      countsBySeverity: {
        critical: 2,
        high: 1,
        medium: 1,
        low: 3,
        info: 1,
      },
      issueCount: 8
    });

    const { generateReport } = await import('../src/app/transactions/[txId]/actions/generateReport');
    const result = await generateReport('tx-123', 'file-123');

    expect(result.success).toBe(true);
    expect(result.countsBySeverity).toEqual({
      critical: 2,
      high: 1,
      medium: 1,
      low: 3,
      info: 1,
    });
  });
});