import type { BillerItem } from "../common/types/biller-item";
import type {
  PayResponse,
  Customer,
  InterSwitchConfig,
} from "../common/types/interswitch";
import { InterSwitchService } from "../integration/interswitch/interswitch.service";
import { InterswitchProvider } from "../providers/interswitch.provider";
import { type BillPayCategory } from "../common/types";

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
   * Fetch available plans from InterSwitch.  You may optionally supply a
   * category to limit the results; this is translated into the generic filter
   * object used by {@link InterSwitchService.getPlans}.
   */
  async getPlans(category?: string): Promise<BillerItem[]> {
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
