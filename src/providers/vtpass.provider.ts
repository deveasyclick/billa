import { Providers, type BillPayCategory } from "../common";
import type { IBillPaymentProvider } from "../common/interfaces/bill-payment-provider";
import type { BillerItem } from "../common/types/biller-item";
import type { PayResponse } from "../common/types/interswitch";
import type { Customer } from "../common/types/payment";
import type {
  VTPassBillCategory,
  VTPassPayPayload,
} from "../common/types/vtpass";
import { VTPassService } from "../integration/vtpass/vtpass.service";

interface VTPassPaymentInput {
  reference: string;
  amount: number;
  customerId?: string;
  plan?: string;
  id?: string;
}

const DEFAULT_PHONE_NUMBER = "+2348111111111";

export class VTPassProvider implements IBillPaymentProvider {
  constructor(private readonly vtpassService: VTPassService) {}

  private buildVtpassPayload(
    payment: VTPassPaymentInput,
    item: BillerItem,
    category: VTPassBillCategory,
  ): VTPassPayPayload {
    switch (category) {
      case "AIRTIME":
        return {
          request_id: payment.reference,
          serviceID: item.billerId,
          phone: payment.customerId || DEFAULT_PHONE_NUMBER,
          amount: Number(payment.amount),
          billersCode: item.billerId,
        };

      case "DATA":
        return {
          request_id: payment.reference,
          serviceID: item.billerId,
          phone: payment.customerId || DEFAULT_PHONE_NUMBER,
          variation_code: item.paymentCode,
          billersCode: DEFAULT_PHONE_NUMBER,
          amount: Number(payment.amount),
        };

      case "TV":
        return {
          request_id: payment.reference,
          serviceID: item.billerId,
          phone: DEFAULT_PHONE_NUMBER,
          variation_code: item.paymentCode,
          billersCode: payment.customerId || "",
          subscription_type: "change",
          amount: Number(payment.amount),
        };

      case "ELECTRICITY":
        return {
          request_id: payment.reference,
          serviceID: item.billerId,
          phone: DEFAULT_PHONE_NUMBER,
          variation_code: payment.plan || "prepaid",
          billersCode: payment.customerId || "",
          amount: Number(payment.amount),
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
      id: cat.identifier,
      name: cat.name,
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
      paymentCode,
      customerId,
      fullName: response.Customer_Name,
    };
  }
}
