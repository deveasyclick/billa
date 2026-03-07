import type { BillerItem } from "../types/biller-item";
import type { PayResponse } from "../types/interswitch";
import type { Customer } from "../types/interswitch";

export interface IBillPaymentProvider {
  executePayment(
    item: BillerItem,
    payment: {
      reference: string;
      amount: number;
      customerId?: string;
      plan?: string;
      id?: string;
    },
  ): Promise<PayResponse>;

  validateCustomer(
    customerId: string,
    paymentCode: string,
    type?: string,
  ): Promise<Customer>;
}
