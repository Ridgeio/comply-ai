/**
 * Parse a currency string to integer cents
 * Accepts formats like "1,234.56", "$1,234.56", "1234", "0"
 * @param value Currency string to parse
 * @returns Integer cents (e.g., "$1.23" returns 123)
 * @throws Error on negative or invalid formats
 */
export function parseCurrencyToCents(value: string): number {
  if (!value || value.trim() === '') {
    throw new Error('Invalid currency format: empty value');
  }

  // Remove whitespace
  let cleaned = value.trim();

  // Check for negative formats
  if (cleaned.startsWith('-') || cleaned.includes('(')) {
    throw new Error('Negative amounts are not allowed');
  }

  // Remove currency symbol
  cleaned = cleaned.replace(/^\$/, '');
  cleaned = cleaned.trim();

  // Special case for just "$"
  if (cleaned === '') {
    throw new Error('Invalid currency format: no amount');
  }

  // Remove commas (but validate they're in the right places)
  // Valid: 1,234.56 or 1,234,567.89
  // Invalid: 12,34.56 or 1,23
  const hasCommas = cleaned.includes(',');
  if (hasCommas) {
    // Check for proper comma placement (every 3 digits from the right, before decimal)
    const parts = cleaned.split('.');
    const integerPart = parts[0];
    
    // Remove commas and check if they were properly placed
    const withoutCommas = integerPart.replace(/,/g, '');
    
    // Rebuild with proper commas to compare
    let properlyFormatted = '';
    for (let i = withoutCommas.length - 1, count = 0; i >= 0; i--, count++) {
      if (count === 3) {
        properlyFormatted = ',' + properlyFormatted;
        count = 0;
      }
      properlyFormatted = withoutCommas[i] + properlyFormatted;
    }
    
    // If the original doesn't match proper format, it's invalid
    if (integerPart !== properlyFormatted && integerPart !== withoutCommas) {
      throw new Error('Invalid currency format: improper comma placement');
    }
    
    cleaned = cleaned.replace(/,/g, '');
  }

  // Validate the remaining format (should be digits with optional decimal)
  if (!/^\d*\.?\d*$/.test(cleaned)) {
    throw new Error('Invalid currency format: contains non-numeric characters');
  }

  // Check for multiple decimal points
  const decimalCount = (cleaned.match(/\./g) || []).length;
  if (decimalCount > 1) {
    throw new Error('Invalid currency format: multiple decimal points');
  }

  // Parse the number
  const parsed = parseFloat(cleaned || '0');
  if (isNaN(parsed)) {
    throw new Error('Invalid currency format: not a number');
  }

  // Convert to cents (multiply by 100 and round to avoid floating point issues)
  const cents = Math.round(parsed * 100);

  // Final check for negative (shouldn't happen but be safe)
  if (cents < 0) {
    throw new Error('Negative amounts are not allowed');
  }

  return cents;
}