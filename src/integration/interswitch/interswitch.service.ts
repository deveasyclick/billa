import axios, { AxiosInstance } from "axios";
import type { PayObject } from "../../common/types/payment";
export type { InterSwitchConfig } from "../../common/types/interswitch";
import type {
  Biller,
  BillerCategoriesResponse,
  BillerCategoryResponse,
  BillersWithCategoriesResponse,
  Category,
  ConfirmTransactionResponse,
  InterSwitchConfig,
  PaymentItem,
  PaymentItemsResponse,
  TransactionResponse,
  ValidateCustomersResponse,
} from "../../common/types/interswitch";
import type { BillerItem } from "../../common/types/biller-item";

type InterswitchTokenResp = {
  access_token: string;
  expires_in: number;
  token_type?: string;
};

type ValidateCustomerRequest = {
  paymentCode: string;
  customerId: string;
};

type MappedBiller = {
  id: number;
  name: string;
  categoryId: number;
  categoryName: string;
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
   * Cached wrapper around {@link fetchPlans}.  By default the result is stored
   * in an in‑memory cache for `ttlMs` milliseconds (default 5 minutes).  Pass
   * `forceRefresh: true` to bypass the cache.  Filters are applied after the
   * plans have been retrieved and cached; cache keys include the stringified
   * filter object.
   */
  /**
   * Backward‑compatible method retained from earlier releases.  It simply
   * proxies to {@link getPlans} without filters and is **deprecated**; prefer
   * `getPlans()` instead.
   */
  async findPlans(): Promise<BillerItem[]> {
    return this.getPlans();
  }

  async getPlans(options?: {
    filters?: Record<string, string[]>;
    forceRefresh?: boolean;
    ttlMs?: number;
  }): Promise<BillerItem[]> {
    const ttl = options?.ttlMs ?? 5 * 60 * 1000;
    const key = JSON.stringify(options?.filters || {});

    // clean up expired entries lazily
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
   * Apply a filter object to an existing list of plans (used internally when
   * retrieving from cache).
   */
  private applyFilters(
    plans: BillerItem[],
    filters: Record<string, string[]>,
  ): BillerItem[] {
    return plans.filter((p) => {
      const allowed = filters[p.category as string];
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

  /**
   * Internal: fetch every plan from the provider, optionally narrowing by
   * category/item filters.  Filters should mirror the shape of
   * `SUPPORTED_BILL_ITEMS` (object where keys are category names and values are
   * arrays of biller identifiers).  Passing no value returns all plans.
   */
  private async fetchPlans(
    filters?: Record<string, string[]>,
  ): Promise<BillerItem[]> {
    const billingItems: BillerItem[] = [];

    // 1️⃣ Fetch categories with billers
    const res = await this.getCategoriesWithBillers();
    const allCategories = res.BillerList?.Category ?? [];

    // 2️⃣ Build list of billers (no filtering yet)
    const billers = allCategories.flatMap((category: Category) => {
      return category.Billers.map((biller: Biller) => ({
        id: biller.Id,
        name: biller.Name,
        categoryId: category.Id,
        categoryName: category.Name,
      }));
    });

    // Filter by provided filters object if present
    const filteredBillers = filters
      ? billers.filter((biller) => {
          const list = filters[biller.categoryName];
          if (!list) return false;

          if (list.length === 0) return true; // return all billers

          // allow match by biller name or id string
          return list.includes(biller.name);
        })
      : billers;
    const validBillers = filteredBillers.filter((b: MappedBiller) => b.id);

    // 3️⃣ Fetch all biller items in parallel (with concurrency control)
    const results = await Promise.allSettled(
      validBillers.map((biller: MappedBiller) =>
        this.fetchBillerItemsSafe(biller),
      ),
    );

    // 4️⃣ Merge successful results
    for (const r of results) {
      if (r.status === "fulfilled") billingItems.push(...r.value);
    }
    return billingItems;
  }

  /**
   * Fetches and transforms biller payment items safely.
   * TODO: Allow items filters
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
        .map((item: PaymentItem) => {
          const amount = Number(item.Amount);
          const displayName = item.Name || item.Id;

          return {
            category: biller.categoryName,
            billerName: item.BillerName,
            name: displayName,
            amount,
            amountType: item.AmountType,
            active: true,
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
}
