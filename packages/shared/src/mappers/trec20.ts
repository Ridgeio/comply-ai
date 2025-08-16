import type { RawTrec20 } from '@repo/parsers';
import { Trec20 } from '../schemas/trec';
import { parseCurrencyToCents } from '../money';

/**
 * Convert a date string from MM/DD/YYYY to ISO format YYYY-MM-DD
 */
function convertDateToIso(dateStr: string): string {
  // Match MM/DD/YYYY format
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) {
    throw new Error(`Invalid date format: ${dateStr}. Expected MM/DD/YYYY`);
  }

  const [, month, day, year] = match;
  // Pad with zeros if needed
  const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  
  // Validate it's a real date
  const parsed = new Date(isoDate);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }

  return isoDate;
}

/**
 * Convert raw TREC20 data (strings) to typed, validated Trec20 model
 */
export function fromRawTrec20(raw: RawTrec20 & { formVersion?: string }): Trec20 {
  // Filter out empty names
  const buyerNames = raw.buyer_names.filter(name => name.trim() !== '');
  const sellerNames = raw.seller_names.filter(name => name.trim() !== '');

  // Normalize address
  const propertyAddress = {
    street: raw.property_address.street.trim(),
    city: raw.property_address.city.trim(),
    state: raw.property_address.state.toUpperCase(),
    zip: raw.property_address.zip.trim(),
  };

  // Convert currency strings to cents
  const salesPrice: any = {
    totalCents: parseCurrencyToCents(raw.sales_price.total || '0'),
  };

  if (raw.sales_price.cash_portion && raw.sales_price.cash_portion.trim()) {
    salesPrice.cashPortionCents = parseCurrencyToCents(raw.sales_price.cash_portion);
  }

  if (raw.sales_price.financed_portion && raw.sales_price.financed_portion.trim()) {
    salesPrice.financedPortionCents = parseCurrencyToCents(raw.sales_price.financed_portion);
  }

  // Build the typed object
  const trec20Data: any = {
    buyerNames,
    sellerNames,
    propertyAddress,
    salesPrice,
  };

  // Convert dates if present
  if (raw.effective_date) {
    trec20Data.effectiveDate = convertDateToIso(raw.effective_date);
  }

  if (raw.closing_date) {
    trec20Data.closingDate = convertDateToIso(raw.closing_date);
  }

  // Convert option fee if present
  if (raw.option_fee && raw.option_fee.trim()) {
    trec20Data.optionFeeCents = parseCurrencyToCents(raw.option_fee);
  }

  // Convert option period days if present
  if (raw.option_period_days && raw.option_period_days.trim()) {
    const days = parseInt(raw.option_period_days, 10);
    if (!isNaN(days) && days > 0) {
      trec20Data.optionPeriodDays = days;
    }
  }

  // Add financing type if valid
  if (raw.financing_type) {
    const validTypes = ['cash', 'conventional', 'fha', 'va', 'other'];
    if (validTypes.includes(raw.financing_type)) {
      trec20Data.financingType = raw.financing_type;
    }
  }

  // Add special provisions if present
  if (raw.special_provisions_text && raw.special_provisions_text.trim()) {
    trec20Data.specialProvisionsText = raw.special_provisions_text.trim();
  }

  // Add form version if present
  if (raw.formVersion) {
    trec20Data.formVersion = raw.formVersion;
  }

  // Validate and return typed object
  return Trec20.parse(trec20Data);
}