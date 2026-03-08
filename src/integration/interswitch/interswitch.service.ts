import axios, { AxiosInstance } from "axios";
import type { PayObject } from "../../common/types/payment";
import type {
  BillerCategoriesResponse,
  BillerCategoryResponse,
  BillersWithCategoriesResponse,
  ConfirmTransactionResponse,
  InterSwitchConfig,
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

export class InterSwitchService {
  private readonly baseUrl: string;
  private readonly httpClient: AxiosInstance;

  constructor(
    private readonly config: InterSwitchConfig,
    httpClient?: AxiosInstance,
  ) {
    this.baseUrl = `${config.apiBaseUrl}/quicktellerservice/api/v5`;
    this.httpClient = httpClient || axios.create();
  }

  async getToken(): Promise<string> {
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

    return data.access_token;
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
    const billers = allCategories.flatMap((category: any) => {
      return category.Billers.map((biller: any) => ({
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
          if (!list || list.length === 0) return true; // no restriction for this category
          // allow match by biller name or id string
          return list.includes(biller.name) || list.includes(String(biller.id));
        })
      : billers;

    const validBillers = filteredBillers.filter((b: any) => b.id);

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
