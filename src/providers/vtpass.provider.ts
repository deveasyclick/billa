import { Providers, type BillPayCategory } from "../common";
import type { IBillPaymentProvider } from "../common/interfaces/bill-payment-provider";
import type { BillerItem } from "../common/types/biller-item";
import type { PayResponse } from "../common/types/interswitch";
import type { Customer } from "../common/types/payment";
import type {
  VTPassBillCategory,
  VTPassPayPayload,
} from "../common/types/vtpass";
import { VTPassService } from "../integration/vtpass/vtpass.service";

interface VTPassPaymentInput {
  reference: string;
  amount: number;
  customerId?: string;
  plan?: string;
  id?: string;
}

const DEFAULT_PHONE_NUMBER = "+2348111111111";

export class VTPassProvider implements IBillPaymentProvider {
  constructor(private readonly vtpassService: VTPassService) {}

  private buildVtpassPayload(
    payment: VTPassPaymentInput,
    item: BillerItem,
    category: VTPassBillCategory,
  ): VTPassPayPayload {
    switch (category) {
      case "AIRTIME":
        return {
          request_id: payment.reference,
          serviceID: item.billerId,
          phone: payment.customerId || DEFAULT_PHONE_NUMBER,
          amount: Number(payment.amount),
          billersCode: item.billerId,
        };

      case "DATA":
        return {
          request_id: payment.reference,
          serviceID: item.billerId,
          phone: payment.customerId || DEFAULT_PHONE_NUMBER,
          variation_code: item.paymentCode,
          billersCode: DEFAULT_PHONE_NUMBER,
          amount: Number(payment.amount),
        };

      case "TV":
        return {
          request_id: payment.reference,
          serviceID: item.billerId,
          phone: DEFAULT_PHONE_NUMBER,
          variation_code: item.paymentCode,
          billersCode: payment.customerId || "",
          subscription_type: "change",
          amount: Number(payment.amount),
        };

      case "ELECTRICITY":
        return {
          request_id: payment.reference,
          serviceID: item.billerId,
          phone: DEFAULT_PHONE_NUMBER,
          variation_code: payment.plan || "prepaid",
          billersCode: payment.customerId || "",
          amount: Number(payment.amount),
        };

      default:
        throw new Error(`Unsupported bill category: ${category}`);
    }
  }

  async executePayment(
    item: BillerItem,
    payment: VTPassPaymentInput,
  ): Promise<PayResponse> {
    const vtpassPayload: VTPassPayPayload = this.buildVtpassPayload(
      payment,
      item,
      item.category as VTPassBillCategory,
    );

    let tx = await this.vtpassService.pay(vtpassPayload);

    // Retry loop for confirmation
    const maxRetries = 3;
    const delayMs = 3000;

    for (let attemptCount = 0; attemptCount < maxRetries; attemptCount++) {
      try {
        // Check if delivered/successful
        if (tx.status === "delivered") {
          return {
            paymentRef: payment.reference,
            amount: Number(tx.amount),
            status: "SUCCESS",
            metadata: {
              transactionId: tx.transactionId,
              extras: (tx as any).extras,
            },
          };
        }

        // Check if failed
        if (tx.status === "failed") {
          throw new Error("Payment failed at provider");
        }

        // Only retry if pending
        if (tx.status === "pending") {
          if (attemptCount < maxRetries - 1) {
            // Wait before retry
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            tx = await this.vtpassService.getTransaction(payment.reference);
            continue;
          }
        }

        // Exit if not pending
        break;
      } catch {
        // ignore and allow retry
      }
    }

    // If still pending after retries, return pending status
    return {
      paymentRef: payment.reference,
      amount: Number(payment.amount),
      status: "PENDING",
      metadata: {
        message: "Transaction pending confirmation",
        transactionStatus: tx.status,
      },
    };
  }

  async listPlans(options?: {
    filters?: Record<string, string[]>;
    forceRefresh?: boolean;
    ttlMs?: number;
  }): Promise<BillerItem[]> {
    return this.vtpassService.getPlans(options);
  }

  async listCategories(): Promise<BillPayCategory[]> {
    const res = await this.vtpassService.getCategories();
    return (res.content || []).map((cat) => ({
      id: cat.identifier,
      name: cat.name,
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
      paymentCode,
      customerId,
      fullName: response.Customer_Name,
    };
  }
}
