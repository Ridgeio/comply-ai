import { PDFDocument } from 'pdf-lib';

export async function readAcroForm(buffer: Uint8Array): Promise<Record<string, string>> {
  try {
    const pdfDoc = await PDFDocument.load(buffer);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    const result: Record<string, string> = {};
    
    for (const field of fields) {
      const fieldName = field.getName();
      
      // Check field type and extract value accordingly
      if ('getText' in field) {
        // TextField
        const textField = field as any;
        const value = textField.getText() || '';
        result[fieldName] = value;
      } else if ('getSelected' in field) {
        // Dropdown or RadioGroup
        const selectField = field as any;
        const selected = selectField.getSelected();
        result[fieldName] = Array.isArray(selected) ? selected[0] || '' : selected || '';
      } else if ('isChecked' in field) {
        // Checkbox
        const checkField = field as any;
        result[fieldName] = checkField.isChecked() ? 'true' : 'false';
      } else {
        // Default to empty string for unknown field types
        result[fieldName] = '';
      }
    }
    
    return result;
  } catch (error) {
    // Return empty object if PDF doesn't have a form or on error
    return {};
  }
}