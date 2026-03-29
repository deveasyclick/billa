import { Providers, type BillPayCategory } from "../common";
import type { IBillPaymentProvider } from "../common/interfaces/bill-payment-provider";
import type { BillerItem } from "../common/types/biller-item";
import type { Customer, PayResponse } from "../common/types/payment";
import type {
  VTPassBillCategory,
  VTPassPayPayload,
} from "../common/types/vtpass";
import type { PayRequest } from "../core";
import { VTPassService } from "../integration/vtpass/vtpass.service";

// TODO: set this in config
const DEFAULT_PHONE_NUMBER = "+2348111111111";

export class VTPassProvider implements IBillPaymentProvider {
  constructor(private readonly vtpassService: VTPassService) {}

  private buildVtpassPayload({
    reference,
    category,
    biller,
    customerId,
    amount,
    paymentCode,
    type,
  }: PayRequest): VTPassPayPayload {
    switch (category as VTPassBillCategory) {
      case "AIRTIME":
        return {
          request_id: reference,
          serviceID: biller,
          phone: customerId,
          amount: amount,
          billersCode: paymentCode,
        };

      case "DATA":
        return {
          request_id: reference,
          serviceID: biller,
          phone: customerId,
          variation_code: paymentCode,
          billersCode: DEFAULT_PHONE_NUMBER,
          amount: amount,
        };

      case "TV":
        return {
          request_id: reference,
          serviceID: biller,
          phone: DEFAULT_PHONE_NUMBER,
          variation_code: paymentCode,
          billersCode: customerId,
          subscription_type: type ?? "change",
          amount: amount,
        };

      case "ELECTRICITY-BILL":
        return {
          request_id: reference,
          serviceID: biller,
          phone: DEFAULT_PHONE_NUMBER,
          variation_code: paymentCode,
          billersCode: customerId,
          amount: amount,
        };

      default:
        throw new Error(`Unsupported bill category: ${category}`);
    }
  }

  async pay(payload: PayRequest): Promise<PayResponse> {
    const vtpassPayload: VTPassPayPayload = this.buildVtpassPayload(payload);

    const tx = await this.vtpassService.pay(vtpassPayload);
    return {
      paymentRef: payload.reference,
      amount: Number(tx.amount),
      status: (tx.content.transactions.status === "delivered" ||
      tx.content.transactions.status === "success"
        ? "success"
        : tx.content.transactions.status.toLowerCase()) as
        | "success"
        | "pending"
        | "failed",
      metadata: {
        customerName: tx.CustomerName,
        customerAddress: tx.CustomerAddress,
        units: tx.Units,
        token: tx.Token,
      },
    };
  }

  async listPlans(options?: {
    filters?: Record<string, string[]>;
    forceRefresh?: boolean;
    ttlMs?: number;
  }): Promise<BillerItem[]> {
    return this.vtpassService.getPlans(options);
  }

  async listCategories(): Promise<BillPayCategory[]> {
    const res = await this.vtpassService.getCategories();
    return (res.content || []).map((cat) => ({
      name: cat.identifier,
      provider: Providers.VTPASS,
    }));
  }

  async validateCustomer(
    customerId: string,
    paymentCode: string,
    type?: string,
  ): Promise<Customer> {
    const response = await this.vtpassService.validateCustomer({
      billersCode: customerId,
      serviceID: paymentCode,
      ...(type && { type }),
    });

    return {
      paymentCode: paymentCode,
      customerId,
      fullName: response.Customer_Name,
    };
  }

  async confirm(reference: string): Promise<PayResponse> {
    const tx = await this.vtpassService.getTransaction(reference);

    // TODO: add a util to return this shape
    return {
      paymentRef: reference,
      amount: Number(tx.amount),
      status: (tx.content.transactions.status === "delivered" ||
      tx.content.transactions.status === "success"
        ? "success"
        : tx.content.transactions.status.toLowerCase()) as
        | "success"
        | "pending"
        | "failed",
      metadata: {
        customerName: tx.CustomerName,
        customerAddress: tx.CustomerAddress,
        units: tx.Units,
        token: tx.Token,
      },
    };
  }
}
