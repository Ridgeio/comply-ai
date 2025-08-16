import { z } from 'zod';

export const MoneyCents = z.number().int().nonnegative();
export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/); // yyyy-mm-dd

export const Address = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  zip: z.string().min(5).max(10),
});

export const SalesPrice = z.object({
  cashPortionCents: MoneyCents.optional(),
  financedPortionCents: MoneyCents.optional(),
  totalCents: MoneyCents,
});

export const FinancingType = z.enum(['cash', 'conventional', 'fha', 'va', 'other']);

export const Trec20 = z.object({
  buyerNames: z.array(z.string().min(1)).min(1),
  sellerNames: z.array(z.string().min(1)).min(1),
  propertyAddress: Address,
  salesPrice: SalesPrice,
  effectiveDate: IsoDate.optional(),
  closingDate: IsoDate.optional(),
  optionFeeCents: MoneyCents.optional(),
  optionPeriodDays: z.number().int().positive().optional(),
  financingType: FinancingType.optional(),
  specialProvisionsText: z.string().optional(),
  formVersion: z.string().optional(), // e.g., "20-18"
});

export const TransactionBundle = z.object({
  forms: z.object({
    trec20: Trec20.optional(),
    // addenda later
  }),
  files: z.array(z.object({
    id: z.string().uuid(),
    path: z.string(),
    kind: z.string(),
  })).optional(),
});

export type Trec20 = z.infer<typeof Trec20>;
export type TransactionBundle = z.infer<typeof TransactionBundle>;