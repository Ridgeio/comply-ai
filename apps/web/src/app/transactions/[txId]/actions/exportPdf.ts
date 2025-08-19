'use server';

import { getAuthenticatedContext } from '@/src/lib/auth-helpers';

export async function exportReportPdf(reportId: string): Promise<Buffer> {
  const { adminClient: supabase } = await getAuthenticatedContext();

  // Fetch report and issues
  const { data: report, error: reportError } = await supabase
    .from('compliance_reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (reportError || !report) {
    throw new Error('Report not found');
  }

  const { data: issues } = await supabase
    .from('compliance_issues')
    .select('*')
    .eq('report_id', reportId)
    .order('severity', { ascending: true });

  // For now, return a stub PDF
  // In production, you would:
  // 1. Render the report as HTML using React SSR
  // 2. Use puppeteer-core or similar to convert HTML to PDF
  // 3. Return the PDF buffer
  
  const stubPdfContent = `
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 200 >>
stream
BT
/F1 24 Tf
50 700 Td
(Compliance Report) Tj
0 -30 Td
/F1 12 Tf
(Report ID: ${reportId}) Tj
0 -20 Td
(Form: ${report.form_type || 'N/A'}) Tj
0 -20 Td
(Issues: ${issues?.length || 0}) Tj
0 -40 Td
(This is a placeholder PDF.) Tj
0 -20 Td
(Full implementation pending.) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000258 00000 n
0000000336 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
636
%%EOF
`;

  return Buffer.from(stubPdfContent.trim());
}

export async function downloadReportPdf(reportId: string): Promise<{ 
  buffer: Buffer; 
  filename: string; 
  contentType: string 
}> {
  const buffer = await exportReportPdf(reportId);
  
  return {
    buffer,
    filename: `compliance-report-${reportId}.pdf`,
    contentType: 'application/pdf'
  };
}