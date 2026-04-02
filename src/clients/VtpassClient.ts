import type { BillerItem } from "../common/types/biller-item.js";
import type { PayResponse, Customer } from "../common/types/payment.js";
import {
  VTPassService,
  type VTPassConfig,
} from "../integrations/vtpass/index.js";
import { VTPassProvider } from "../providers/vtpass.provider.js";
import { type BillpayCategory } from "../common/types/index.js";
import {
  type IBillpayClient,
  type PayRequest,
  type ValidateCustomerRequest,
  type SingleProviderGetPlansOptions,
} from "./IBillpayClient.js";

export interface VtpassClientConfig {
  vtpass: VTPassConfig;
}

export class VtpassClient implements IBillpayClient<SingleProviderGetPlansOptions> {
  private readonly service: VTPassService;
  private readonly provider: VTPassProvider;

  constructor(config: VtpassClientConfig) {
    this.service = new VTPassService(config.vtpass);
    this.provider = new VTPassProvider(this.service);
  }

  async getPlans(
    options?: SingleProviderGetPlansOptions,
  ): Promise<BillerItem[]> {
    const filters = options?.filters;

    return this.provider.listPlans({
      filters,
    });
  }

  async getCategories(): Promise<BillpayCategory[]> {
    return this.provider.listCategories();
  }

  async pay(request: PayRequest): Promise<PayResponse> {
    return this.provider.pay(request);
  }

  async validateCustomer(request: ValidateCustomerRequest): Promise<Customer> {
    return this.provider.validateCustomer(
      request.customerId,
      request.paymentCode,
      request.type,
    );
  }

  /**
   * Confirm a payment with VTpass.
   */
  async confirmTransaction(reference: string): Promise<PayResponse> {
    return this.provider.confirm(reference);
  }
}
