import { Providers, type BillaCategory } from "../common/index.js";
import type { IBillPaymentProvider } from "../common/interfaces/bill-payment-provider.js";
import type { BillerItem } from "../common/types/biller-item.js";
import type { Customer, PayResponse } from "../common/types/payment.js";
import type {
  VTPassBillCategory,
  VTPassPayPayload,
  VTPassTransactionResponse,
} from "../common/types/vtpass.js";
import normalizeStatus from "../common/utils/normalizeStatus.js";
import type { PayRequest } from "../clients/index.js";
import { VTPassService } from "../integrations/vtpass/index.js";

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
          billersCode: this.vtpassService.config.phone,
          amount: amount,
        };

      case "TV":
        return {
          request_id: reference,
          serviceID: biller,
          phone: this.vtpassService.config.phone,
          variation_code: paymentCode,
          billersCode: customerId,
          subscription_type: type ?? "change",
          amount: amount,
        };

      case "ELECTRICITY-BILL":
        return {
          request_id: reference,
          serviceID: biller,
          phone: this.vtpassService.config.phone,
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
    return this.mapTransactionToPayResponse(payload.reference, tx);
  }

  async listPlans(options?: {
    filters?: Record<string, string[]>;
  }): Promise<BillerItem[]> {
    return this.vtpassService.getPlans(options);
  }

  async listCategories(): Promise<BillaCategory[]> {
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

    return this.mapTransactionToPayResponse(reference, tx);
  }

  private mapTransactionToPayResponse(
    reference: string,
    tx: VTPassTransactionResponse,
  ): PayResponse {
    return {
      paymentRef: reference,
      amount: Number(tx.amount),
      status: normalizeStatus(tx.content.transactions.status),
      metadata: {
        customerName: tx.CustomerName ?? tx.customerName,
        customerAddress: tx.CustomerAddress ?? tx.customerAddress,
        units: tx.Units ?? tx.units,
        token: tx.Token ?? tx.token,
      },
    };
  }
}
