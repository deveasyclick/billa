export interface PayObject {
  customerId: string;
  paymentCode: string;
  amount: number; // in kobo
  requestReference: string;
}

export enum ProviderResult {
  SUCCESS = "SUCCESS",
  PENDING = "PENDING",
  FAILED = "FAILED",
}

export interface Customer {
  TerminalId: string;
  BillerId: number;
  PaymentCode: string;
  CustomerId: string;
  ResponseCode: string;
  FullName: string;
  Amount: number;
  AmountType: number;
  AmountTypeDescription: string;
  Surcharge: number;
}
