import { Providers, type BillpayCategory } from "../../common/index.js";
import type { IBillPaymentProvider } from "../../common/interfaces/bill-payment-provider.js";
import type { BillerItem } from "../../common/types/biller-item.js";
import type { Customer, PayResponse } from "../../common/types/payment.js";
import normalizeStatus from "../../common/utils/normalizeStatus.js";
import type { PayRequest } from "../../clients/index.js";
import { InterSwitchService } from "../../integrations/interswitch/index.js";
import type {
  Category,
  Biller,
  PaymentItem,
} from "../../common/types/interswitch.js";

type MappedBiller = {
  id: number;
  name: string;
  categoryId: number;
  categoryName: string;
};

export class InterswitchProvider implements IBillPaymentProvider {
  constructor(private readonly interswitchService: InterSwitchService) {}

  async pay(payload: PayRequest): Promise<PayResponse> {
    const resp = await this.interswitchService.pay({
      customerId: payload.customerId || "N/A",
      paymentCode: payload.paymentCode,
      amount: payload.amount,
      requestReference: payload.reference,
    });

    return {
      paymentRef: payload.reference,
      amount: resp.ApprovedAmount,
      metadata: resp.AdditionalInfo,
      status: normalizeStatus(resp.ResponseCodeGrouping),
    };
  }

  async listPlans(options?: {
    filters?: Record<string, string[]>;
  }): Promise<BillerItem[]> {
    return this.fetchPlans(options?.filters);
  }

  async listCategories(): Promise<BillpayCategory[]> {
    const res = await this.interswitchService.getBillerCategories();
    return (res.BillerCategories || []).map((cat) => ({
      name: cat.Name,
      provider: Providers.INTERSWITCH,
    }));
  }

  async validateCustomer(
    customerId: string,
    paymentCode: string,
    _type?: string,
  ): Promise<Customer> {
    const response = await this.interswitchService.validateCustomer({
      customerId,
      paymentCode,
    });

    const [customer] = response.Customers;
    if (customer.ResponseCode !== "90000") {
      throw new Error(customer.ResponseDescription);
    }

    return {
      paymentCode,
      customerId,
      fullName: customer.FullName,
      amount: customer.Amount,
      amountType: customer.AmountType,
    };
  }

  async confirm(reference: string): Promise<PayResponse> {
    const resp = await this.interswitchService.confirmTransaction(reference);

    return {
      paymentRef: reference,
      amount: resp.ApprovedAmount,
      metadata: resp.AdditionalInfo,
      status: normalizeStatus(resp.ResponseCodeGrouping),
    };
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
    const res = await this.interswitchService.getCategoriesWithBillers();
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
      const itemsResp = await this.interswitchService.getBillerPaymentItems(
        String(biller.id),
      );
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
    } catch (err: unknown) {
      console.warn(
        `[Interswitch] Failed to fetch items for ${biller.name} (${biller.id}) in ${biller.categoryName}:`,
        err,
      );
      return [];
    }
  }
}
