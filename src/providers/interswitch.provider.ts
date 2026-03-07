import type { IBillPaymentProvider } from '../common/interfaces/bill-payment-provider';
import type { BillerItem } from '../common/types/biller-item';
import type { Customer, PayResponse } from '../common/types/interswitch';
import { InterSwitchService } from '../integration/interswitch/interswitch.service';

interface InterswitchPaymentInput {
  reference: string;
  amount: number;
  customerId?: string;
  plan?: string;
  id?: string;
}

export class InterswitchProvider implements IBillPaymentProvider {
  constructor(private readonly interswitchService: InterSwitchService) {}

  async executePayment(
    item: BillerItem,
    payment: InterswitchPaymentInput,
  ): Promise<PayResponse> {
    // Step 1: Call provider pay()
    let payResp = await this.interswitchService.pay({
      customerId: payment.customerId || 'N/A',
      paymentCode: item.paymentCode,
      amount: payment.amount,
      requestReference: payment.reference,
    });

    // Retry loop for confirmation
    const maxRetries = 5;
    const delayMs = 3000;

    for (let attemptCount = 0; attemptCount < maxRetries; attemptCount++) {
      try {
        // Check if successful
        if (payResp.ResponseCodeGrouping === 'SUCCESSFUL') {
          return {
            paymentRef: payment.reference,
            amount: Number(payResp.Amount),
            status: 'SUCCESS',
            metadata: { transactionRef: payResp.TransactionRef },
          };
        }

        // Check if failed
        if (payResp.ResponseCodeGrouping === 'FAILED') {
          throw new Error('Payment failed at provider');
        }

        // Only retry if pending
        if (payResp.ResponseCodeGrouping === 'PENDING') {
          if (attemptCount < maxRetries - 1) {
            // Wait before retry
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            const confirmedTx =
              await this.interswitchService.confirmTransaction(
                payment.reference,
              );
            payResp = confirmedTx as any;
            continue;
          }
        }

        // Exit if not pending
        break;
      } catch (err) {
        const isLikelyFailed =
          (err as any)?.response?.data?.ResponseCodeGrouping === 'FAILED';
        if (isLikelyFailed) {
          throw new Error('Payment failed at provider');
        }
        // Continue retry loop on other errors
      }
    }

    // If still pending after retries, return pending status
    return {
      paymentRef: payment.reference,
      amount: Number(payment.amount),
      status: 'PENDING',
      metadata: {
        message: 'Transaction pending confirmation',
        transactionStatus: payResp.ResponseCodeGrouping,
      },
    };
  }

  async validateCustomer(
    customerId: string,
    paymentCode: string,
    _type?: string,
  ): Promise<Customer> {
    const response = await this.interswitchService.validateCustomer(
      customerId,
      paymentCode,
    );
    return response.Customers?.[0] ?? ({} as Customer);
  }
}
