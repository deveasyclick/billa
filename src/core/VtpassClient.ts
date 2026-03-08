import type { BillerItem } from "../common/types/biller-item";
import type { PayResponse, Customer } from "../common/types/interswitch";
import type { BillCategory } from "../common/types/vtpass";
import {
  VTPassService,
  type VTPassConfig,
} from "../integration/vtpass/vtpass.service";
import { VTPassProvider } from "../providers/vtpass.provider";

export interface VtpassClientConfig {
  vtpass: VTPassConfig;
}

export class VtpassClient {
  private readonly service: VTPassService;
  private readonly provider: VTPassProvider;

  constructor(config: VtpassClientConfig) {
    this.service = new VTPassService(config.vtpass);
    this.provider = new VTPassProvider(this.service);
  }

  async getPlans(category?: BillCategory): Promise<BillerItem[]> {
    if (category) {
      return this.service.getPlans({ filters: { [category]: [] } });
    }
    return this.service.getPlans();
  }

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

  async validateCustomer(
    customerId: string,
    paymentCode: string,
    type?: string,
  ): Promise<Customer> {
    return this.provider.validateCustomer(customerId, paymentCode, type);
  }
}
