import type { BillerItem } from "../common/types/biller-item";
import type { PayResponse, Customer } from "../common/types/payment";
import {
  VTPassService,
  type VTPassConfig,
} from "../integration/vtpass/vtpass.service";
import { VTPassProvider } from "../providers/vtpass.provider";
import { type BillPayCategory } from "../common/types";
import type { VTPassBillCategory } from "../common/types/vtpass";

import { type IBillPayClient, type PayRequest, type ValidateCustomerRequest, type GetPlansOptions } from "./IBillPayClient";

export interface VtpassClientConfig {
  vtpass: VTPassConfig;
}

export class VtpassClient implements IBillPayClient {
  private readonly service: VTPassService;
  private readonly provider: VTPassProvider;

  constructor(config: VtpassClientConfig) {
    this.service = new VTPassService(config.vtpass);
    this.provider = new VTPassProvider(this.service);
  }

  async getPlans(options?: GetPlansOptions): Promise<BillerItem[]> {
    const category = options?.category;
    if (category) {
      return this.service.getPlans({
        filters: { [category as VTPassBillCategory]: [] },
      });
    }
    return this.service.getPlans();
  }

  async getCategories(): Promise<BillPayCategory[]> {
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
