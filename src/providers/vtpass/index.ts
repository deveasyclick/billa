import { Providers, type BillpayCategory } from "../../common/index.js";
import type { IBillPaymentProvider } from "../../common/interfaces/bill-payment-provider.js";
import type { BillerItem } from "../../common/types/biller-item.js";
import type { Customer, PayResponse } from "../../common/types/payment.js";
import type {
  VTPassBillCategory,
  VTPassPayPayload,
  VTPassTransactionResponse,
} from "../../common/types/vtpass.js";
import normalizeStatus from "../../common/utils/normalizeStatus.js";
import type { PayRequest } from "../../clients/index.js";
import { VTPassService } from "../../integrations/vtpass/index.js";

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
    return this.fetchPlans(options?.filters);
  }

  async listCategories(): Promise<BillpayCategory[]> {
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

  /**
   * Internal builder that constructs plans by querying VTpass endpoints.
   * Optionally applies filters afterwards.
   */
  private async fetchPlans(
    filters?: Record<string, string[]>,
  ): Promise<BillerItem[]> {
    if (filters && Object.keys(filters).length === 0) {
      return [];
    }
    const plans: BillerItem[] = [];
    // retrieve categories from VTpass and iterate
    const categoriesResp = await this.vtpassService.getCategories();
    for (const cat of categoriesResp.content) {
      const category = cat.identifier.toUpperCase();

      if (filters && !(category in filters)) continue;
      const billers = filters?.[category];

      const allowAllBillers = !billers || billers.length === 0;

      const normalizedBillers = billers?.map((b) => b.toLowerCase());

      const servicesResp = await this.vtpassService.getServices(cat.identifier);
      for (const svc of servicesResp.content) {
        if (!allowAllBillers) {
          const name = svc.name.toLowerCase();
          const id = svc.serviceID.toLowerCase();

          if (
            !normalizedBillers!.includes(name) &&
            !normalizedBillers!.includes(id)
          ) {
            continue;
          }
        }

        if (category === "ELECTRICITY-BILL") {
          plans.push(
            {
              category,
              billerName: svc.name,
              provider: "VTPASS",
              billerId: svc.serviceID,
              paymentCode: "prepaid",
              name: svc.name,
              amount: 0,
              amountType: 0,
              active: true,
              image: svc.image,
            },
            {
              category,
              billerName: svc.name,
              provider: "VTPASS",
              billerId: svc.serviceID,
              paymentCode: "postpaid",
              name: svc.name,
              amount: 0,
              amountType: 0,
              active: true,
              image: svc.image,
            },
          );

          continue;
        }

        // if product_type is flexible, it means it has variations
        if (svc.product_type === "flexible") {
          plans.push({
            category,
            billerName: svc.name,
            provider: "VTPASS",
            billerId: svc.serviceID,
            paymentCode: svc.serviceID,
            name: svc.name,
            amount: 0,
            amountType: 0,
            active: true,
            image: svc.image,
          });
          continue;
        }

        const variants = await this.vtpassService.getServiceVariants(
          svc.serviceID,
        );
        if (variants && variants.length > 0) {
          for (const variant of variants) {
            plans.push({
              category,
              billerName: svc.name,
              provider: "VTPASS",
              billerId: svc.serviceID,
              paymentCode: variant.variation_code,
              name: variant.name,
              amount: Number(variant.variation_amount),
              amountType: 0,
              active: true,
              image: svc.image,
            });
          }
        } else {
          plans.push({
            category,
            billerName: svc.name,
            provider: "VTPASS",
            billerId: svc.serviceID,
            paymentCode: svc.serviceID,
            name: svc.name,
            amount: 0,
            amountType: 0,
            active: true,
            image: svc.image,
          });
        }
      }
    }

    return plans;
  }
}
