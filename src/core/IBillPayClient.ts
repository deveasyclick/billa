import type { BillerItem, BillPayCategory } from "../common/types";
import type { PayResponse, Customer } from "../common/types/interswitch";
import { type ProviderType } from "../providers/bill-payment-provider.factory";

/**
 * Common request structure for a bill payment
 */
export interface PayRequest {
  billingItemId: string;
  paymentReference: string;
  billerItem: BillerItem;
  customerId: string;
  amount: number;
  plan?: string;
  provider?: ProviderType;
}

/**
 * Request structure for customer validation
 */
export interface ValidateCustomerRequest {
  customerId: string;
  paymentCode: string;
  type?: string;
  provider?: ProviderType;
}

/**
 * Options for fetching available plans
 */
export interface GetPlansOptions {
  category?: string;
  provider?: ProviderType | "BOTH";
  filters?: {
    interswitch?: Record<string, string[]>;
    vtpass?: Record<string, string[]>;
  };
  forceRefresh?: boolean;
  ttlMs?: number;
}

/**
 * Unified interface for all single-provider BillPay clients.
 */
export interface IBillPayClient {
  /**
   * Fetch available plans from the provider.
   */
  getPlans(options?: GetPlansOptions): Promise<BillerItem[]>;

  /**
   * Get available biller categories from the provider.
   */
  getCategories(): Promise<BillPayCategory[]>;

  /**
   * Execute a payment.
   */
  pay(request: PayRequest): Promise<PayResponse>;

  /**
   * Validate a customer ID against a service (e.g. meter number, smartcard id).
   */
  validateCustomer(request: ValidateCustomerRequest): Promise<Customer>;
}
