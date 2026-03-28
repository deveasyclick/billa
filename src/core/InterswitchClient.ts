import type { BillerItem } from "../common/types/biller-item";
import type { InterSwitchConfig } from "../common/types/interswitch";
import { InterSwitchService } from "../integration/interswitch/interswitch.service";
import { InterswitchProvider } from "../providers/interswitch.provider";
import { type BillPayCategory } from "../common/types";
import {
  type IBillPayClient,
  type PayRequest,
  type ValidateCustomerRequest,
  type GetPlansOptions,
} from "./IBillPayClient";
import type { Customer, PayResponse } from "../common/types/payment";

/**
 * Configuration for the single-provider Interswitch client.
 *
 * This type intentionally mirrors the portion of `BillPayClientConfig` that
 * pertains to InterSwitch; we keep it separate so the public API is clearer.
 */
export interface InterswitchClientConfig {
  interswitch: InterSwitchConfig;
}

export class InterswitchClient implements IBillPayClient {
  private readonly service: InterSwitchService;
  private readonly provider: InterswitchProvider;

  constructor(config: InterswitchClientConfig) {
    this.service = new InterSwitchService(config.interswitch);
    this.provider = new InterswitchProvider(this.service);
  }

  /**
   * Fetch available plans from InterSwitch.
   */
  async getPlans(options?: GetPlansOptions): Promise<BillerItem[]> {
    const category = options?.category;
    if (category) {
      // send empty array for category to indicate "all items in this category"
      return this.service.getPlans({ filters: { [category]: [] } });
    }
    return this.service.getPlans();
  }

  /**
   * Get available bill categories from InterSwitch.
   */
  async getCategories(): Promise<BillPayCategory[]> {
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
}
