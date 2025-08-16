/**
 * OCR Provider Interface and Implementations
 */

export type OcrResult = {
  fullText: string
}

export interface OcrProvider {
  recognize(buffer: Uint8Array): Promise<OcrResult>
}

/**
 * Mock OCR provider for testing
 * Returns predefined text regardless of input
 */
export class MockOcr implements OcrProvider {
  constructor(private text: string) {}
  
  async recognize(): Promise<OcrResult> {
    return { fullText: this.text }
  }
}

/**
 * Parse TREC form data from OCR text using regex patterns
 */
export function parseRawFromOcrText(text: string): Record<string, string> {
  const raw: Record<string, string> = {}
  
  // Extract buyer and seller names from PARTIES section
  const partiesMatch = text.match(/PARTIES:.*?are\s+([^(]+?)\s*\(Seller\)\s*and\s+([^(]+?)\s*\(Buyer\)/i)
  if (partiesMatch) {
    // Seller names
    const sellerNames = partiesMatch[1].trim()
    raw.seller_names = sellerNames.split(/\s+and\s+/i).map(n => n.trim()).join(', ')
    
    // Buyer names  
    const buyerNames = partiesMatch[2].trim()
    raw.buyer_names = buyerNames.split(/\s+and\s+/i).map(n => n.trim()).join(', ')
  } else {
    // Fallback patterns
    const buyerMatch = text.match(/Buyer[s]?[:]?\s*([^(]+?)\s*\(Buyer\)/i) || text.match(/Buyer:\s*([^\n]+)/i)
    if (buyerMatch) {
      const buyerNames = buyerMatch[1].trim()
      raw.buyer_names = buyerNames.split(/\s+and\s+/i).map(n => n.trim()).join(', ')
    }
    
    const sellerMatch = text.match(/(?:are|Seller[s]?[:]?)\s*([^(]+?)\s*\(Seller\)/i) || text.match(/Seller:\s*([^\n]+)/i)
    if (sellerMatch) {
      const sellerNames = sellerMatch[1].trim()
      raw.seller_names = sellerNames.split(/\s+and\s+/i).map(n => n.trim()).join(', ')
    }
  }
  
  // Extract property address - handle various formats including TREC form style
  const propertyMatch = text.match(/known as\s+(\d+\s+[^,\n]+?(?:St|Street|Ln|Lane|Dr|Drive|Rd|Road|Ave|Avenue|Blvd|Boulevard|Way|Court|Ct|Place|Pl|Circle|Cir|Trail|Tr|Parkway|Pkwy)[^,\n]*),\s*[^,]*?,?\s*City of\s+([^,\n]+),\s*([A-Z]{2})\s*(\d{5})/i) ||
                       text.match(/(?:known as|Property:|address)\s*([^,\n]+?(?:St|Street|Ln|Lane|Dr|Drive|Rd|Road|Ave|Avenue|Blvd|Boulevard|Way|Court|Ct|Place|Pl|Circle|Cir|Trail|Tr|Parkway|Pkwy)[^,\n]*),?\s*(?:City of\s+)?([^,\n]+),?\s*([A-Z]{2})\s*(\d{5})/i)
  if (propertyMatch) {
    raw.property_street_address = propertyMatch[1].trim()
    raw.property_city = propertyMatch[2].trim().replace(/^City of\s+/i, '')
    raw.property_state = propertyMatch[3].trim()
    raw.property_zip = propertyMatch[4].trim()
  }
  
  // Extract total price - handle various formats including TREC style
  const priceMatch = text.match(/Sales\s+Price\s*\(Sum\s+of\s+A\s+and\s+B\)\s*\.+\s*\$\s*([\d,]+(?:\.\d{2})?)/i) ||
                    text.match(/(?:Total\s+(?:Sales\s+)?Price)\s*[:.)]\s*\$?\s*([\d,]+(?:\.\d{2})?)/i) ||
                    text.match(/(?:Sales\s+Price)\s*[:.)]\s*\$?\s*([\d,]+(?:\.\d{2})?)/i)
  if (priceMatch) {
    raw.total_sales_price = priceMatch[1].replace(/[,$]/g, '')
  }
  
  // Extract option fee - handle various formats
  const optionFeeMatch = text.match(/(?:Option\s+Fee|Buyer's\s+agreement\s+to\s+pay\s+Seller)\s*[:]?\s*\$\s*([\d,]+(?:\.\d{2})?)/i)
  if (optionFeeMatch) {
    raw.option_fee = optionFeeMatch[1].replace(/[,$]/g, '')
  }
  
  // Extract option period - handle various formats
  const optionPeriodMatch = text.match(/(?:within|Option\s+Period[:]?)\s*(\d+)\s*days?\s+(?:after|of)/i) ||
                            text.match(/Option\s+Period[:]?\s*(\d+)\s*days?/i)
  if (optionPeriodMatch) {
    raw.option_period_days = optionPeriodMatch[1]
  }
  
  // Extract closing date - handle various formats
  const closingDateMatch = text.match(/(?:closing[^.]*?(?:on\s+or\s+before|will\s+be\s+on))\s*([A-Z][a-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/i) ||
                           text.match(/Closing\s+Date[:]?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
  if (closingDateMatch) {
    raw.closing_date = closingDateMatch[1]
  }
  
  // Extract special provisions
  const specialProvisionsMatch = text.match(/Special\s+Provisions:\s*([^\n]+)/i)
  if (specialProvisionsMatch) {
    raw.special_provisions = specialProvisionsMatch[1].trim()
  }
  
  // Extract earnest money - handle various formats
  const earnestMoneyMatch = text.match(/(?:deposit|Earnest\s+Money[:]?)\s*\$\s*([\d,]+(?:\.\d{2})?)/i)
  if (earnestMoneyMatch) {
    raw.earnest_money = earnestMoneyMatch[1].replace(/[,$]/g, '')
  }
  
  // Extract title company - handle various formats
  const titleCompanyMatch = text.match(/(?:with|escrow\s+agent[,:]?)\s*([A-Z][\w\s]+(?:Title|Escrow)[\w\s]*Company)/i)
  if (titleCompanyMatch) {
    raw.title_company = titleCompanyMatch[1].trim()
  }
  
  // Extract effective date
  const effectiveDateMatch = text.match(/Effective\s+Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
  if (effectiveDateMatch) {
    raw.effective_date = effectiveDateMatch[1]
  }
  
  // Extract HOA fees
  const hoaMatch = text.match(/HOA\s+(?:Fees?|Dues):\s*\$?([\d,]+(?:\.\d{2})?)/i)
  if (hoaMatch) {
    raw.hoa_fees = hoaMatch[1].replace(/[,$]/g, '')
  }
  
  // Extract survey information
  const surveyMatch = text.match(/Survey:\s*([^\n]+)/i)
  if (surveyMatch) {
    raw.survey = surveyMatch[1].trim()
  }
  
  // Extract financing information
  const financingMatch = text.match(/Financing:\s*([^\n]+)/i)
  if (financingMatch) {
    raw.financing = financingMatch[1].trim()
  }
  
  return raw
}