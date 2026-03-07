import axios, { AxiosInstance } from "axios";
import type { PayObject } from "../../common/types/payment";
import type {
  BillerCategoriesResponse,
  BillerCategoryResponse,
  BillersWithCategoriesResponse,
  ConfirmCardPaymentResponse,
  ConfirmTransactionResponse,
  PaymentItemsResponse,
  TransactionResponse,
  ValidateCustomersResponse,
} from "../../common/types/interswitch";
import type { BillerItem } from "../../common/types/biller-item";
import type { BillCategory } from "../../common/types/vtpass";
import {
  SUPPORTED_BILLERS,
  SUPPORTED_ELECTRICITY_PROVIDERS,
  SUPPORTED_BILL_ITEMS,
} from "../../common/constants/biller";
import {
  getStaticInternalCode,
  isStaticCategory,
} from "../../common/utils/static-codes";

interface StoredToken {
  access_token: string;
  token_type: string;
  expiry: number; // timestamp in ms
}

interface CacheInterface {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
}

export interface InterSwitchConfig {
  clientId: string;
  secretKey: string;
  terminalId: string;
  apiBaseUrl: string;
  authUrl: string;
  paymentBaseUrl: string;
  merchantCode: string;
  paymentReferencePrefix: string;
}

const INTERSWITCH_BASIC_TOKEN_KEY = "interswitch:token";

export class InterSwitchService {
  private pendingTokenPromise: Promise<string> | null = null;
  private readonly baseUrl: string;
  private readonly httpClient: AxiosInstance;
  private cache: CacheInterface;

  constructor(
    private readonly config: InterSwitchConfig,
    cache?: CacheInterface,
    httpClient?: AxiosInstance,
  ) {
    this.baseUrl = `${config.apiBaseUrl}/quicktellerservice/api/v5`;
    this.httpClient = httpClient || axios.create();

    // Default in-memory cache if not provided
    this.cache =
      cache ||
      new (class implements CacheInterface {
        private store = new Map<string, { value: string; expiry?: number }>();

        async get(key: string): Promise<string | undefined> {
          const item = this.store.get(key);
          if (!item) return undefined;
          if (item.expiry && Date.now() > item.expiry) {
            this.store.delete(key);
            return undefined;
          }
          return item.value;
        }

        async set(key: string, value: string, ttl?: number): Promise<void> {
          this.store.set(key, {
            value,
            expiry: ttl ? Date.now() + ttl * 1000 : undefined,
          });
        }

        async del(key: string): Promise<void> {
          this.store.delete(key);
        }
      })();
  }

  async getToken(forceRefresh = false): Promise<string> {
    // Return in-progress promise if any
    if (this.pendingTokenPromise) {
      return this.pendingTokenPromise;
    }

    // Try cache first (unless forceRefresh)
    if (!forceRefresh) {
      const cached = await this.cache.get(INTERSWITCH_BASIC_TOKEN_KEY);
      if (cached) {
        try {
          const token: StoredToken = JSON.parse(cached);
          // refresh a little before expiry (e.g. 60s buffer)
          const bufferMs = 60 * 1000;
          if (Date.now() + bufferMs < token.expiry) {
            return token.access_token;
          }
        } catch (_e) {
          // corrupted cache — continue to refresh
        }
      }
    }

    this.pendingTokenPromise = (async () => {
      try {
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

        const token: StoredToken = {
          access_token: data.access_token,
          token_type: data.token_type ?? "Bearer",
          expiry: Date.now() + data.expires_in * 1000,
        };

        await this.cache.set(
          INTERSWITCH_BASIC_TOKEN_KEY,
          JSON.stringify(token),
          Math.floor(data.expires_in),
        );

        return token.access_token;
      } catch (err: any) {
        // ensure we clear cache / pending if failed
        await this.cache.del(INTERSWITCH_BASIC_TOKEN_KEY).catch(() => {});
        throw new Error(
          `Failed to get Interswitch token: ${err.response?.data?.message || err.message}`,
        );
      } finally {
        this.pendingTokenPromise = null;
      }
    })();

    return this.pendingTokenPromise;
  }

  async getBillerCategories(): Promise<BillerCategoriesResponse> {
    const { data } = await this.httpClient.get<BillerCategoriesResponse>(
      `${this.baseUrl}/services/categories`,
    );
    return data;
  }

  async getCategoriesWithBillers(): Promise<BillersWithCategoriesResponse> {
    const { data } = await this.httpClient.get<BillersWithCategoriesResponse>(
      `${this.baseUrl}/services`,
    );
    return data;
  }

  async getBillerCategory(categoryId: number): Promise<BillerCategoryResponse> {
    const { data } = await this.httpClient.get<BillerCategoryResponse>(
      `${this.config.apiBaseUrl}/quicktellerservice/api/v5/services?categoryid=${categoryId}`,
    );
    return data;
  }

  async getBillerPaymentItems(
    serviceId: string,
  ): Promise<PaymentItemsResponse> {
    const { data } = await this.httpClient.get<PaymentItemsResponse>(
      `${this.config.apiBaseUrl}/quicktellerservice/api/v5/services/options?serviceid=${serviceId}`,
    );
    return data;
  }

  async validateCustomer(
    customerId: string,
    paymentCode: string,
  ): Promise<ValidateCustomersResponse> {
    const body = {
      Customers: [
        {
          PaymentCode: paymentCode,
          CustomerId: customerId,
        },
      ],
      TerminalId: this.config.terminalId,
    };

    const { data } = await this.httpClient.post<ValidateCustomersResponse>(
      `${this.config.apiBaseUrl}/quicktellerservice/api/v5/Transactions/validatecustomers`,
      body,
    );
    return data;
  }

  async pay({
    customerId,
    paymentCode,
    amount,
    requestReference,
  }: PayObject): Promise<TransactionResponse> {
    const body = {
      paymentCode,
      customerId,
      customerMobile: customerId,
      amount,
      requestReference: `${this.config.paymentReferencePrefix}${requestReference}`,
    };

    const { data } = await this.httpClient.post<TransactionResponse>(
      `${this.config.apiBaseUrl}/quicktellerservice/api/v5/Transactions`,
      body,
    );
    return data;
  }

  async confirmTransaction(
    reference: string,
  ): Promise<ConfirmTransactionResponse> {
    const { data } = await this.httpClient.get<ConfirmTransactionResponse>(
      `${this.config.paymentBaseUrl}/quicktellerservice/api/v5/Transactions?requestRef=${this.config.paymentReferencePrefix}${reference}`,
    );
    return data;
  }

  async confirmCardPayment({
    amount,
    transactionReference,
  }: {
    amount: number;
    transactionReference: string;
  }): Promise<ConfirmCardPaymentResponse> {
    const { data } = await this.httpClient.get<ConfirmCardPaymentResponse>(
      `${this.config.paymentBaseUrl}/gettransaction.json?merchantCode=${this.config.merchantCode}&amount=${amount}&transactionReference=${transactionReference}`,
    );
    return data;
  }

  async findPlans(): Promise<BillerItem[]> {
    const supportedCategories = Object.keys(SUPPORTED_BILL_ITEMS);
    const billingItems: BillerItem[] = [];

    // 1️⃣ Fetch categories with billers
    const res = await this.getCategoriesWithBillers();
    const allCategories = res.BillerList?.Category ?? [];

    // 2️⃣ Extract only supported billers
    const billers = allCategories.flatMap((category: any) => {
      if (!supportedCategories.includes(category.Name)) return [];

      const supportedBillerNames =
        (SUPPORTED_BILL_ITEMS as any)[category.Name] || [];
      return category.Billers.filter((biller: any) =>
        supportedBillerNames.includes(biller.Name),
      ).map((biller: any) => ({
        id: biller.Id,
        name: biller.Name,
        categoryId: category.Id,
        categoryName: category.Name,
      }));
    });

    // Filter out invalid billers
    const validBillers = billers.filter((b: any) => b.id);

    // 3️⃣ Fetch all biller items in parallel (with concurrency control)
    const results = await Promise.allSettled(
      validBillers.map((biller: any) => this.fetchBillerItemsSafe(biller)),
    );

    // 4️⃣ Merge successful results
    for (const r of results) {
      if (r.status === "fulfilled") billingItems.push(...r.value);
    }

    return billingItems;
  }

  /**
   * Fetches and transforms biller payment items safely.
   */
  private async fetchBillerItemsSafe(biller: {
    id: number;
    name: string;
    categoryId: number;
    categoryName: string;
  }): Promise<BillerItem[]> {
    try {
      const itemsResp = await this.getBillerPaymentItems(String(biller.id));
      const items = itemsResp.PaymentItems ?? [];

      return items
        .map((item: any) => {
          const amount = Number(item.Amount);
          let displayName = item.Name || item.Id;
          const category = this.getCategory(
            biller.categoryName,
            item.BillerName,
          );
          if (!category) return null;

          // return if airtime and amount is greater than 50 naira and amount type is greater than 1
          if (category === "AIRTIME" && amount > 5000 && item.AmountType > 1) {
            return null;
          }

          let internalCode = this.getInternalCode(
            item.BillerName,
            category as BillCategory,
            Math.round(amount / 100), // convert amount to naira
          );

          if (category === "ELECTRICITY") {
            // use internal code as display name for electricity
            displayName = internalCode.split("-").join(" ").toUpperCase();

            // add postpaid or prepaid to internal code
            if (item.BillerName.toLowerCase().includes("postpaid")) {
              internalCode = `${internalCode}-postpaid`;
            } else {
              internalCode = `${internalCode}-prepaid`;
            }
          }

          if (category === "GAMING") {
            displayName = item.BillerName;
          }

          return {
            category,
            billerName: item.BillerName,
            name: displayName,
            amount,
            amountType: item.AmountType,
            active: true,
            internalCode,
            paymentCode: item.PaymentCode,
            billerId: String(item.BillerId),
            provider: "INTERSWITCH",
          };
        })
        .filter(Boolean) as BillerItem[];
    } catch (err: any) {
      console.warn(
        `[Interswitch] Failed to fetch items for ${biller.name} (${biller.id}) in ${biller.categoryName}:`,
        err.response?.data ?? err.message ?? err,
      );
      return [];
    }
  }

  private getCategory(
    categoryName: string,
    billerName: string,
  ): BillCategory | null {
    // category in provider is 'Mobile Recharge'
    if (
      categoryName === "Mobile Recharge" ||
      (categoryName === "Mobile/Recharge" && billerName.includes("Data"))
    ) {
      return "AIRTIME";
    }

    // category in production is 'Airtime and Data'
    if (
      categoryName === "Airtime and Data" ||
      categoryName === "Airtel Data" ||
      (categoryName === "Mobile/Recharge" && billerName.includes("Data"))
    ) {
      return "DATA";
    }

    if (categoryName === "Utility Bills" || categoryName === "Utilities") {
      return "ELECTRICITY";
    }

    // category in provider is 'Cable TV'
    if (categoryName === "Cable TV Bills" || categoryName === "Cable TV") {
      return "TV";
    }

    if (categoryName === "Betting, Lottery and Gaming") {
      return "GAMING";
    }

    return null;
  }

  private getInternalCode(
    billerName: string,
    category: BillCategory,
    amount: number,
  ): string {
    let name =
      SUPPORTED_BILLERS.find((name: string) =>
        billerName.toLowerCase().includes(name),
      ) || billerName;

    if (name.toLowerCase().includes("t2")) {
      name = "9mobile";
    }

    if (category === "ELECTRICITY") {
      const billerNameLower = billerName.toLowerCase();

      for (const [key, value] of Object.entries(
        SUPPORTED_ELECTRICITY_PROVIDERS,
      )) {
        const values = Array.isArray(value) ? value : [value];

        // Check if the biller name contains the key or any of the value strings
        if (
          billerNameLower.includes(key) ||
          values.some((v) => billerNameLower.includes(v))
        ) {
          name = key;
          break;
        }
      }
    }

    if (isStaticCategory(category)) {
      return getStaticInternalCode(name, category);
    }

    // e.g: mtn-data-amount
    return `${name} ${category} ${Math.round(amount)}`
      .split(" ")
      .join("-")
      .toLowerCase();
  }
}
