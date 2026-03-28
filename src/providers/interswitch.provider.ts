import { Providers, type BillPayCategory } from "../common";
import type { IBillPaymentProvider } from "../common/interfaces/bill-payment-provider";
import type { BillerItem } from "../common/types/biller-item";
import type { Customer, PayResponse } from "../common/types/payment";
import type { PayRequest } from "../core";
import { InterSwitchService } from "../integration/interswitch/interswitch.service";

export class InterswitchProvider implements IBillPaymentProvider {
  constructor(private readonly interswitchService: InterSwitchService) {}

  async pay(payload: PayRequest): Promise<PayResponse> {
    const resp = await this.interswitchService.pay({
      customerId: payload.customerId || "N/A",
      paymentCode: payload.paymentCode,
      amount: payload.amount,
      requestReference: payload.reference,
    });

    return {
      paymentRef: payload.reference,
      amount: resp.ApprovedAmount,
      metadata: resp.AdditionalInfo,
      status: (resp.ResponseCodeGrouping === "SUCCESSFUL"
        ? "success"
        : resp.ResponseCodeGrouping.toLowerCase()) as
        | "success"
        | "pending"
        | "failed",
    };
  }

  async listPlans(options?: {
    filters?: Record<string, string[]>;
    forceRefresh?: boolean;
    ttlMs?: number;
  }): Promise<BillerItem[]> {
    return this.interswitchService.getPlans(options);
  }

  async listCategories(): Promise<BillPayCategory[]> {
    const res = await this.interswitchService.getBillerCategories();
    return (res.BillerCategories || []).map((cat) => ({
      id: String(cat.Id),
      name: cat.Name,
      provider: Providers.INTERSWITCH,
    }));
  }

  async validateCustomer(
    customerId: string,
    paymentCode: string,
    _type?: string,
  ): Promise<Customer> {
    const response = await this.interswitchService.validateCustomer({
      customerId,
      paymentCode,
    });

    const [customer] = response.Customers;
    if (customer.ResponseCode !== "90000") {
      throw new Error(customer.ResponseDescription);
    }

    return {
      paymentCode,
      customerId,
      fullName: customer.FullName,
      amount: customer.Amount,
      amountType: customer.AmountType,
    };
  }
}
