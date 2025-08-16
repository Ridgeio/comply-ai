export interface RawTrec20 {
  buyer_names: string[];
  seller_names: string[];
  property_address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  sales_price: {
    cash_portion: string;
    financed_portion: string;
    total: string;
  };
  effective_date?: string;
  closing_date?: string;
  option_fee?: string;
  option_period_days?: string;
  financing_type?: 'cash' | 'conventional' | 'fha' | 'va' | 'other';
  special_provisions_text?: string;
}

export interface VersionDetectionResult {
  form: 'TREC-20' | 'unknown';
  version?: string;
  effectiveDateText?: string;
}