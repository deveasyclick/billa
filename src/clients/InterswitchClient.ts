import type { BillerItem } from "../common/types/biller-item.js";
import type { InterSwitchConfig } from "../common/types/interswitch.js";
import { InterSwitchService } from "../integrations/interswitch/index.js";
import { InterswitchProvider } from "../providers/interswitch.provider.js";
import { type BillpayCategory } from "../common/types/index.js";
import {
  type IBillpayClient,
  type PayRequest,
  type ValidateCustomerRequest,
  type SingleProviderGetPlansOptions,
} from "./IBillpayClient.js";
import type { Customer, PayResponse } from "../common/types/payment.js";

/**
 * Configuration for the single-provider Interswitch client.
 *
 * This type intentionally mirrors the portion of `BillpayClientConfig` that
 * pertains to InterSwitch; we keep it separate so the public API is clearer.
 */
export interface InterswitchClientConfig {
  interswitch: InterSwitchConfig;
}

export class InterswitchClient implements IBillpayClient<SingleProviderGetPlansOptions> {
  private readonly service: InterSwitchService;
  private readonly provider: InterswitchProvider;

  constructor(config: InterswitchClientConfig) {
    this.service = new InterSwitchService(config.interswitch);
    this.provider = new InterswitchProvider(this.service);
  }

  /**
   * Fetch available plans from InterSwitch.
   */
  async getPlans(
    options?: SingleProviderGetPlansOptions,
  ): Promise<BillerItem[]> {
    const filters = options?.filters;

    return this.provider.listPlans({
      filters,
    });
  }

  /**
   * Get available bill categories from InterSwitch.
   */
  async getCategories(): Promise<BillpayCategory[]> {
    return this.provider.listCategories();
  }

  /**
   * Execute a payment using InterSwitch only.
   */
  async pay(request: PayRequest): Promise<PayResponse> {
    return this.provider.pay(request);
  }

  /**
   * Validate a customer against InterSwitch.
   */
  async validateCustomer(request: ValidateCustomerRequest): Promise<Customer> {
    return this.provider.validateCustomer(
      request.customerId,
      request.paymentCode,
      request.type,
    );
  }

  /**
   * Confirm a payment with InterSwitch.
   */
  async confirmTransaction(reference: string): Promise<PayResponse> {
    return this.provider.confirm(reference);
  }
}
