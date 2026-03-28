import type { BillPayCategory } from "../types";
import type { BillerItem } from "../types/biller-item";
import type { PayRequest } from "../../core";
import type { Customer, PayResponse } from "../types/payment";

export interface IBillPaymentProvider {
  pay(payload: PayRequest): Promise<PayResponse>;

  validateCustomer(
    customerId: string,
    paymentCode: string,
    type?: string,
  ): Promise<Customer>;

  /**
   * Retrieve biller items/plans exposed by the provider.  Filters and caching
   * behaviour are passed through to the underlying service.
   */
  listPlans?(options?: {
    filters?: Record<string, string[]>;
    forceRefresh?: boolean;
    ttlMs?: number;
  }): Promise<BillerItem[]>;

  /**
   * Retrieve biller categories exposed by the provider.  Filters and caching
   * behaviour are passed through to the underlying service.
   */
  listCategories(): Promise<BillPayCategory[]>;
}
