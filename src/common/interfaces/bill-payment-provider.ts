import type { BillerItem } from "../types/biller-item";
import type { PayResponse, Customer } from "../types/interswitch";

export interface IBillPaymentProvider {
  executePayment(
    item: BillerItem,
    payment: {
      reference: string;
      amount: number;
      customerId?: string;
      plan?: string;
      id?: string;
    },
  ): Promise<PayResponse>;

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
}
