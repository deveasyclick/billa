import type { BillerItem, BillpayCategory } from "../common/types/index.js";
import type { Customer, PayResponse } from "../common/types/payment.js";
import type { VTPassBillCategory } from "../common/types/vtpass.js";
import {
  type ProviderType,
  type ProviderTarget,
} from "../providers/bill-payment-provider.factory.js";

/**
 * Common request structure for a bill payment
 */
export interface PayRequest {
  reference: string;
  customerId: string;
  amount: number;
  paymentCode: string;
  category: VTPassBillCategory | string;
  biller: string;
  type?: string;
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
  provider?: ProviderTarget;
  filters?: {
    interswitch?: Record<string, string[]>;
    vtpass?: Record<string, string[]>;
  };
}

export interface SingleProviderGetPlansOptions {
  filters?: Record<string, string[]>;
}

/**
 * Unified interface for all single-provider Billpay clients.
 */
export interface IBillpayClient<TGetPlansOptions = GetPlansOptions> {
  /**
   * Fetch available plans from the provider.
   */
  getPlans(options?: TGetPlansOptions): Promise<BillerItem[]>;

  /**
   * Get available biller categories from the provider.
   */
  getCategories(provider?: ProviderTarget): Promise<BillpayCategory[]>;

  /**
   * Execute a payment.
   */
  pay(request: PayRequest): Promise<PayResponse>;

  /**
   * Validate a customer ID against a service (e.g. meter number, smartcard id).
   */
  validateCustomer(request: ValidateCustomerRequest): Promise<Customer>;

  /**
   * Confirm/Requery a transaction.
   */
  confirmTransaction(
    reference: string,
    provider?: ProviderType,
  ): Promise<PayResponse>;
}
