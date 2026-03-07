import type { BillCategory } from "../../common/types/vtpass";
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
import {
  getStaticInternalCode,
  isStaticCategory,
} from "../../common/utils/static-codes";
import { SUPPORTED_BILLERS } from "../../common/constants/biller";
import axios, { AxiosInstance } from "axios";
import { STATIC_BILL_ITEMS } from "./vtpass.constants";

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
          api_key: this.config.apiKey,
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
          api_key: this.config.apiKey,
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
          api_key: this.config.apiKey,
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

  async getPlans(): Promise<BillerItem[]> {
    return (
      await Promise.all([this.getStaticPlans(), this.getDynamicPlans()])
    ).flat();
  }

  async getDynamicPlans(): Promise<BillerItem[]> {
    const dynamicServices = STATIC_BILL_ITEMS.filter(
      (item) => item.category === "DATA" || item.category === "TV",
    );

    const results = await Promise.allSettled(
      dynamicServices.map(async (service: any) => {
        const provider = service.providers.find(
          (p: any) => p.name === "VTPASS",
        );
        if (!provider) return [];

        const variations = await this.getServiceVariants(provider.billerId);
        return variations.map((variant: any) => ({
          internalCode: this.getInternalCode(
            service.name,
            service.category,
            variant.variation_amount,
          ),
          category: service.category,
          billerName: service.name,
          provider: "VTPASS",
          billerId: provider.billerId,
          paymentCode: variant.variation_code,
          name: variant.name,
          amount: Number(variant.variation_amount),
          amountType: 0,
          active: true,
          image: service.image,
        }));
      }),
    );

    const items = results
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => (r as PromiseFulfilledResult<BillerItem[]>).value);

    return items;
  }

  private getStaticPlans(): BillerItem[] {
    const items: BillerItem[] = [];

    // Select only non-dynamic categories (e.g., airtime, electricity, etc.)
    const staticServices = STATIC_BILL_ITEMS.filter(
      (item: any) => item.category !== "DATA" && item.category !== "TV",
    );

    for (const service of staticServices) {
      const provider = service.providers.find((p: any) => p.name === "VTPASS");
      if (!provider) continue;

      items.push({
        internalCode: this.getInternalCode(service.name, service.category, 0),
        category: service.category,
        billerName: service.name,
        provider: "VTPASS",
        billerId: provider.billerId,
        paymentCode:
          service.category === "ELECTRICITY" ? "prepaid" : provider.billerId,
        name: service.name,
        amount: 0, // Amount entered by user (e.g. airtime or electricity)
        amountType: 0, // 0 means fixed amount
        active: true,
        image: service.image,
      });
    }

    return items;
  }

  async pay(
    payload: VTPassPayPayload,
  ): Promise<VTPassTransactionResponse["content"]["transactions"]> {
    const { data } = await this.httpClient.post<VTPassTransactionResponse>(
      `${this.config.apiBaseUrl}/pay`,
      payload,
      {
        headers: {
          api_key: this.config.apiKey,
          Authorization: `Bearer ${this.config.secretKey}`,
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

    return data.content.transactions;
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
          api_key: this.config.apiKey,
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
          api_key: this.config.apiKey,
        },
      },
    );

    if (data.code !== "000" || (data.content as { error: string }).error) {
      throw new Error(
        `Failed to validate customer: ${data?.response_description}`,
      );
    }

    return data.content as VTPassCustomer;
  }

  private getInternalCode(
    billerName: string,
    category: BillCategory,
    amount: number | string,
  ): string {
    const name =
      SUPPORTED_BILLERS.find((name: string) =>
        billerName.toLowerCase().includes(name),
      ) || billerName;

    if (isStaticCategory(category)) {
      return getStaticInternalCode(name, category);
    }

    // e.g: mtn-data-500
    return `${name} ${category} ${Math.round(Number(amount))}`
      .split(" ")
      .join("-")
      .toLowerCase();
  }
}
