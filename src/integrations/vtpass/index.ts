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
} from "../../common/types/vtpass.js";
import axios, { AxiosInstance } from "axios";

export interface VTPassConfig {
  apiKey: string;
  secretKey: string;
  apiBaseUrl: string;
  publicKey?: string;
  phone: string;
}

export class VTPassApiClient {
  private readonly httpClient: AxiosInstance;

  constructor(
    public readonly config: VTPassConfig,
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

  async getTransaction(requestId: string): Promise<VTPassTransactionResponse> {
    const { data } = await this.httpClient.post<VTPassTransactionResponse>(
      `${this.config.apiBaseUrl}/requery`,
      {
        request_id: requestId,
      },
      {
        headers: {
          "API-KEY": this.config.apiKey,
          "SECRET-KEY": this.config.secretKey,
        },
      },
    );

    if (!data?.response_description || data.code !== "000") {
      throw new Error(
        `Failed to get transaction ${requestId}: ${data?.response_description}`,
      );
    }

    return data;
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
