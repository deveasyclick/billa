import { Providers, type BillpayCategory } from "../../common/index.js";
import type { IBillPaymentProvider } from "../../common/interfaces/bill-payment-provider.js";
import type { BillerItem } from "../../common/types/biller-item.js";
import type { Customer, PayResponse } from "../../common/types/payment.js";
import type {
  VTPassBillCategory,
  VTPassPayPayload,
  VTPassService,
  VTPassTransactionResponse,
} from "../../common/types/vtpass.js";
import normalizeStatus from "../../common/utils/normalizeStatus.js";
import type { PayRequest } from "../../clients/index.js";
import { VTPassApiClient } from "../../integrations/vtpass/index.js";

export class VTPassProvider implements IBillPaymentProvider {
  constructor(private readonly vtpassApiClient: VTPassApiClient) {}

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
          billersCode: this.vtpassApiClient.config.phone,
          amount: amount,
        };

      case "TV":
        return {
          request_id: reference,
          serviceID: biller,
          phone: this.vtpassApiClient.config.phone,
          variation_code: paymentCode,
          billersCode: customerId,
          subscription_type: type ?? "change",
          amount: amount,
        };

      case "ELECTRICITY-BILL":
        return {
          request_id: reference,
          serviceID: biller,
          phone: this.vtpassApiClient.config.phone,
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

    const tx = await this.vtpassApiClient.pay(vtpassPayload);
    return this.mapTransactionToPayResponse(payload.reference, tx);
  }

  async listPlans(options?: {
    filters?: Record<string, string[]>;
  }): Promise<BillerItem[]> {
    return this.fetchPlans(options?.filters);
  }

  async listCategories(): Promise<BillpayCategory[]> {
    const res = await this.vtpassApiClient.getCategories();
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
    const response = await this.vtpassApiClient.validateCustomer({
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
    const tx = await this.vtpassApiClient.getTransaction(reference);

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
    if (filters && Object.keys(filters).length === 0) return [];

    const categoriesResp = await this.vtpassApiClient.getCategories();

    const relevantCategories = categoriesResp.content.filter((cat) => {
      if (!filters) return true;
      return cat.identifier.toUpperCase() in filters;
    });

    // Fetch all services in parallel
    const categoryServices = await Promise.allSettled(
      relevantCategories.map(async (cat) => {
        const servicesResp = await this.vtpassApiClient.getServices(
          cat.identifier,
        );
        return { cat, services: servicesResp.content };
      }),
    );

    const serviceEntries = categoryServices
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => {
        const { cat, services } = (r as PromiseFulfilledResult<any>).value;
        const category = cat.identifier.toUpperCase();
        const allowedBillers = filters?.[category];
        return this.filterServices(services, allowedBillers).map((svc) => ({
          category,
          svc,
        }));
      });

    // Expand each service into plan(s), fetching variants in parallel
    const planGroups = await Promise.allSettled(
      serviceEntries.map(({ category, svc }) =>
        this.expandServiceToPlans(category, svc),
      ),
    );

    return planGroups
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => (r as PromiseFulfilledResult<BillerItem[]>).value);
  }

  private filterServices(
    services: VTPassService[],
    allowedBillers?: string[],
  ): VTPassService[] {
    if (!allowedBillers || allowedBillers.length === 0) return services;

    const normalized = new Set(allowedBillers.map((b) => b.toLowerCase()));
    return services.filter(
      (svc) =>
        normalized.has(svc.name.toLowerCase()) ||
        normalized.has(svc.serviceID.toLowerCase()),
    );
  }

  private async expandServiceToPlans(
    category: string,
    svc: VTPassService,
  ): Promise<BillerItem[]> {
    const base = this.makeBasePlan(category, svc);

    if (category === "ELECTRICITY-BILL") {
      return [
        { ...base, paymentCode: "prepaid" },
        { ...base, paymentCode: "postpaid" },
      ];
    }

    if (svc.product_type === "flexible") {
      return [base];
    }

    const variants = await this.vtpassApiClient.getServiceVariants(
      svc.serviceID,
    );
    if (variants && variants.length > 0) {
      return variants.map((variant) => ({
        ...base,
        paymentCode: variant.variation_code,
        name: variant.name,
        amount: Number(variant.variation_amount),
      }));
    }

    return [base];
  }

  private makeBasePlan(category: string, svc: VTPassService): BillerItem {
    return {
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
    };
  }
}
