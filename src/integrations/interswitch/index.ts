import axios, { AxiosInstance } from "axios";
import type { PayObject } from "../../common/types/payment.js";
export type { InterSwitchConfig } from "../../common/types/interswitch.js";
import type {
  BillerCategoriesResponse,
  BillerCategoryResponse,
  BillersWithCategoriesResponse,
  ConfirmTransactionResponse,
  InterSwitchConfig,
  PaymentItemsResponse,
  TransactionResponse,
  ValidateCustomersResponse,
} from "../../common/types/interswitch.js";

type InterswitchTokenResp = {
  access_token: string;
  expires_in: number;
  token_type?: string;
};

type ValidateCustomerRequest = {
  paymentCode: string;
  customerId: string;
};

export class InterSwitchService {
  private readonly baseUrl: string;
  private readonly httpClient: AxiosInstance;

  private token?: string;
  private tokenExpiry?: number;

  constructor(
    private readonly config: InterSwitchConfig,
    httpClient?: AxiosInstance,
  ) {
    this.baseUrl = `${config.apiBaseUrl}/quicktellerservice/api/v5`;
    this.httpClient =
      httpClient ||
      axios.create({
        baseURL: this.baseUrl,
        timeout: 15000,
      });
  }

  /**
   * Get cached token or fetch new one
   */
  private async getAuthToken(): Promise<string> {
    const now = Date.now();

    if (this.token && this.tokenExpiry && now < this.tokenExpiry) {
      return this.token;
    }

    const data = await this.fetchToken();

    this.token = data.access_token;

    // subtract 60s buffer
    this.tokenExpiry = now + data.expires_in * 1000 - 60000;

    return this.token;
  }

  /**
   * Wrapper for authenticated requests
   */
  private async request<T>(
    method: "GET" | "POST",
    url: string,
    data?: unknown,
  ): Promise<T> {
    const token = await this.getAuthToken();

    const response = await this.httpClient.request<T>({
      method,
      url,
      data,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  }

  async fetchToken(): Promise<InterswitchTokenResp> {
    const basic = Buffer.from(
      `${this.config.clientId}:${this.config.secretKey}`,
    ).toString("base64");

    const resp = await this.httpClient.post(
      this.config.authUrl,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${basic}`,
        },
      },
    );

    const data = resp.data as {
      access_token: string;
      expires_in: number;
      token_type?: string;
    };

    if (!data?.access_token || !data?.expires_in) {
      throw new Error("Invalid token response from Interswitch");
    }

    return data;
  }

  /**
   * Get bill categories
   */
  async getBillerCategories(): Promise<BillerCategoriesResponse> {
    return this.request("GET", "/services/categories");
  }

  /**
   * Get categories with billers
   */
  async getCategoriesWithBillers(): Promise<BillersWithCategoriesResponse> {
    return this.request("GET", "/services");
  }

  /**
   * Get billers for a category
   */
  async getCategoryBillers(
    categoryId: number,
  ): Promise<BillerCategoryResponse> {
    return this.request("GET", `/services?categoryid=${categoryId}`);
  }

  /**
   * Get payment items for a biller
   */
  async getBillerPaymentItems(
    serviceId: string,
  ): Promise<PaymentItemsResponse> {
    return this.request("GET", `/services/options?serviceid=${serviceId}`);
  }

  /**
   * Validate customer
   */
  async validateCustomer(
    request: ValidateCustomerRequest,
  ): Promise<ValidateCustomersResponse> {
    const body = {
      Customers: [
        {
          PaymentCode: request.paymentCode,
          CustomerId: request.customerId,
        },
      ],
      TerminalId: this.config.terminalId,
    };

    return this.request("POST", "/Transactions/validatecustomers", body);
  }

  /**
   * Pay bill
   */
  async pay(request: PayObject): Promise<TransactionResponse> {
    const body = {
      paymentCode: request.paymentCode,
      customerId: request.customerId,
      customerMobile: request.customerId,
      amount: request.amount,
      requestReference: `${this.config.paymentReferencePrefix}${request.requestReference}`,
    };

    return this.request("POST", "/Transactions", body);
  }

  /**
   * Confirm transaction
   */
  async confirmTransaction(
    reference: string,
  ): Promise<ConfirmTransactionResponse> {
    return this.request(
      "GET",
      `/Transactions?requestRef=${this.config.paymentReferencePrefix}${reference}`,
    );
  }
}
