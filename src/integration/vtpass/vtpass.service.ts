import type {
  GetVTPassCategoryResponse,
  GetVTPassServiceResponse,
  GetVTPassVariationsResponse,
  VTPassCustomer,
  VTPassPayPayload,
  VTPassTransactionResponse,
  VTPassValidateCustomerResponse,
  VTPassVerifyCustomerPayload,
  VTPassVerifyMeterNoPayload,
} from "../../common/types/vtpass";
import type { BillerItem } from "../../common/types/biller-item";
import axios, { AxiosInstance } from "axios";

export interface VTPassConfig {
  apiKey: string;
  secretKey: string;
  apiBaseUrl: string;
  publicKey?: string;
}

export class VTPassService {
  private readonly httpClient: AxiosInstance;

  constructor(
    private readonly config: VTPassConfig,
    httpClient?: AxiosInstance,
  ) {
    this.httpClient = httpClient || axios.create();
  }

  async getCategories(): Promise<GetVTPassCategoryResponse> {
    const { data } = await this.httpClient.get<GetVTPassCategoryResponse>(
      `${this.config.apiBaseUrl}/service-categories`,
      {
        headers: {
          "API-KEY": this.config.apiKey,
        },
      },
    );

    if (!data?.response_description || data.response_description !== "000") {
      throw new Error(
        `Failed to get categories: ${data?.response_description}`,
      );
    }

    return data;
  }

  async getServices(category: string): Promise<GetVTPassServiceResponse> {
    const { data } = await this.httpClient.get<GetVTPassServiceResponse>(
      `${this.config.apiBaseUrl}/services?identifier=${category}`,
      {
        headers: {
          "API-KEY": this.config.apiKey,
        },
      },
    );

    if (!data?.response_description || data.response_description !== "000") {
      throw new Error(
        `Failed to get services for category ${category}: ${data?.response_description}`,
      );
    }

    return data;
  }

  async getServiceVariants(
    serviceId: string,
  ): Promise<GetVTPassVariationsResponse["content"]["variations"]> {
    const { data } = await this.httpClient.get<GetVTPassVariationsResponse>(
      `${this.config.apiBaseUrl}/service-variations?serviceID=${serviceId}`,
      {
        headers: {
          "API-KEY": this.config.apiKey,
        },
      },
    );

    if (!data?.response_description || data.response_description !== "000") {
      throw new Error(
        `Failed to get service variations for ${serviceId}: ${data?.response_description}`,
      );
    }

    return data.content.variations;
  }

  /**
   * Fetch available plans, optionally filtering by category/biller and using an
   * in-memory cache (TTL default 5 minutes).  See service documentation for
   * `filters` shape; you can pass `forceRefresh` to bypass the cache.
   */
  async getPlans(options?: {
    filters?: Record<string, string[]>;
    forceRefresh?: boolean;
    ttlMs?: number;
  }): Promise<BillerItem[]> {
    const ttl = options?.ttlMs ?? 5 * 60 * 1000;
    const key = JSON.stringify(options?.filters || {});
    const now = Date.now();
    const cached = this.planCache.get(key);
    if (cached && now < cached.expiry && !options?.forceRefresh) {
      return options?.filters
        ? this.applyFilters(cached.plans, options.filters)
        : cached.plans;
    }

    const plans = await this.fetchPlans(options?.filters);
    this.planCache.set(key, { plans, expiry: now + ttl });
    return plans;
  }

  /**
   * Apply filter object to a list of plans (used for cached results).
   */
  private applyFilters(
    plans: BillerItem[],
    filters: Record<string, string[]>,
  ): BillerItem[] {
    return plans.filter((p) => {
      const allowed = filters[p.category];
      if (!allowed || allowed.length === 0) return true;
      return allowed.includes(p.billerName) || allowed.includes(p.billerId);
    });
  }

  // simple in-memory cache keyed by filter JSON
  private readonly planCache: Map<
    string,
    { plans: BillerItem[]; expiry: number }
  > = new Map();

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
    const categoriesResp = await this.getCategories();
    for (const cat of categoriesResp.content) {
      const category = cat.identifier.toUpperCase();

      if (filters && !(category in filters)) continue;
      const billers = filters?.[category];

      const allowAllBillers = !billers || billers.length === 0;

      const normalizedBillers = billers?.map((b) => b.toLowerCase());

      const servicesResp = await this.getServices(cat.identifier);
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

        const variants = await this.getServiceVariants(svc.serviceID);
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

  async pay(payload: VTPassPayPayload): Promise<VTPassTransactionResponse> {
    const { data } = await this.httpClient.post<VTPassTransactionResponse>(
      `${this.config.apiBaseUrl}/pay`,
      payload,
      {
        headers: {
          "API-KEY": this.config.apiKey,
          "SECRET-KEY": this.config.secretKey,
        },
      },
    );

    if (
      !data?.response_description ||
      (data.code !== "000" && data.code !== "099")
    ) {
      throw new Error(
        `Failed to buy ${payload.serviceID}: ${data?.response_description}`,
      );
    }
    return data;
  }

  async getTransaction(
    requestId: string,
  ): Promise<VTPassTransactionResponse["content"]["transactions"]> {
    const { data } = await this.httpClient.post<VTPassTransactionResponse>(
      `${this.config.apiBaseUrl}/requery`,
      {
        request_id: requestId,
      },
      {
        headers: {
          "API-KEY": this.config.apiKey,
        },
      },
    );

    if (!data?.response_description || data.code !== "000") {
      throw new Error(
        `Failed to get transaction ${requestId}: ${data?.response_description}`,
      );
    }

    return data.content.transactions;
  }

  async validateCustomer(
    payload: VTPassVerifyCustomerPayload | VTPassVerifyMeterNoPayload,
  ): Promise<VTPassCustomer> {
    const { data } = await this.httpClient.post<VTPassValidateCustomerResponse>(
      `${this.config.apiBaseUrl}/merchant-verify`,
      payload,
      {
        headers: {
          "API-KEY": this.config.apiKey,
          "SECRET-KEY": this.config.secretKey,
        },
      },
    );
    if (data.code !== "000" || (data.content as { error: string }).error) {
      throw new Error(
        `Failed to validate customer: ${(data.content as { error: string }).error}`,
      );
    }

    return data.content as VTPassCustomer;
  }
}
