export interface PayObject {
  customerId: string;
  paymentCode: string;
  amount: number;
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

export interface PayResponse {
  paymentRef: string;
  amount: number;
  metadata: Record<string, unknown>;
  status: "success" | "pending" | "failed";
}
