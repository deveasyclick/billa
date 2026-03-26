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
  paymentCode: string;
  customerId: string;
  fullName: string;

  //for interswitch
  amount?: number;
  amountType?: number;
}
