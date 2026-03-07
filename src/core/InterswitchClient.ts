import type { BillerItem } from "../common/types/biller-item";
import type { PayResponse, Customer } from "../common/types/interswitch";
import type { BillCategory } from "../common/types/vtpass";
import {
  InterSwitchService,
  type InterSwitchConfig,
} from "../integration/interswitch/interswitch.service";
import { InterswitchProvider } from "../providers/interswitch.provider";

/**
 * Configuration for the single-provider Interswitch client.
 *
 * This type intentionally mirrors the portion of `BillPayClientConfig` that
 * pertains to InterSwitch; we keep it separate so the public API is clearer.
 */
export interface InterswitchClientConfig {
  interswitch: InterSwitchConfig;
}

export class InterswitchClient {
  private readonly service: InterSwitchService;
  private readonly provider: InterswitchProvider;

  constructor(config: InterswitchClientConfig) {
    this.service = new InterSwitchService(config.interswitch);
    this.provider = new InterswitchProvider(this.service);
  }

  /**
   * Fetch available plans from InterSwitch.  Category filter is optional.
   */
  async getPlans(category?: BillCategory): Promise<BillerItem[]> {
    const plans = await this.service.findPlans();
    if (category) {
      return plans.filter(
        (p) => p.category.toUpperCase() === category.toUpperCase(),
      );
    }
    return plans;
  }

  /**
   * Execute a payment using InterSwitch only.
   */
  async pay(request: {
    billingItemId: string;
    paymentReference: string;
    billerItem: BillerItem;
    customerId: string;
    amount: number;
    plan?: string;
  }): Promise<PayResponse> {
    return this.provider.executePayment(request.billerItem, {
      reference: request.paymentReference,
      amount: request.amount,
      customerId: request.customerId,
      plan: request.plan,
      id: request.billingItemId,
    });
  }

  /**
   * Validate a customer against InterSwitch.
   */
  async validateCustomer(
    customerId: string,
    paymentCode: string,
    type?: string,
  ): Promise<Customer> {
    return this.provider.validateCustomer(customerId, paymentCode, type);
  }
}
