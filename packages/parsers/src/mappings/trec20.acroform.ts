export interface FieldMapping {
  fieldName: string;
  path: string[];
  arrayIndex?: number;
}

export const TREC20_FIELD_MAPPINGS: FieldMapping[] = [
  { fieldName: 'Buyer1Name', path: ['buyer_names'], arrayIndex: 0 },
  { fieldName: 'Buyer2Name', path: ['buyer_names'], arrayIndex: 1 },
  { fieldName: 'Seller1Name', path: ['seller_names'], arrayIndex: 0 },
  { fieldName: 'Seller2Name', path: ['seller_names'], arrayIndex: 1 },
  { fieldName: 'PropertyStreet', path: ['property_address', 'street'] },
  { fieldName: 'PropertyCity', path: ['property_address', 'city'] },
  { fieldName: 'PropertyState', path: ['property_address', 'state'] },
  { fieldName: 'PropertyZip', path: ['property_address', 'zip'] },
  { fieldName: 'SalesPriceTotal', path: ['sales_price', 'total'] },
  { fieldName: 'SalesPriceCash', path: ['sales_price', 'cash_portion'] },
  { fieldName: 'SalesPriceLoan', path: ['sales_price', 'financed_portion'] },
  { fieldName: 'EffectiveDate', path: ['effective_date'] },
  { fieldName: 'ClosingDate', path: ['closing_date'] },
  { fieldName: 'OptionFee', path: ['option_fee'] },
  { fieldName: 'OptionPeriodDays', path: ['option_period_days'] },
  { fieldName: 'FinancingType', path: ['financing_type'] },
  { fieldName: 'SpecialProvisions', path: ['special_provisions_text'] }
];