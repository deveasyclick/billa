import type { BillpayCategory } from "../types/index.js";
import type { BillerItem } from "../types/biller-item.js";
import type { PayRequest } from "../../clients/index.js";
import type { Customer, PayResponse } from "../types/payment.js";

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
  listPlans(options?: {
    filters?: Record<string, string[]>;
  }): Promise<BillerItem[]>;

  /**
   * Retrieve biller categories exposed by the provider.  Filters and caching
   * behaviour are passed through to the underlying service.
   */
  listCategories(): Promise<BillpayCategory[]>;

  /**
   * Confirm/Requery a transaction.
   */
  confirm(reference: string): Promise<PayResponse>;
}
