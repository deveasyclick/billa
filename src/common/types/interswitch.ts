export interface Category {
  Id: number;
  Name: string;
  Billers: Biller[];
}

export interface Biller {
  Id: number;
  Name: string;
  CurrencyCode: string;
}

interface BillerList {
  Count: number;
  Category: Category[];
}

export interface BillerCategoryResponse {
  BillerList: BillerList;
  ResponseCode: string;
  ResponseCodeGrouping: string;
}

export interface BillerCategoriesResponse {
  BillerCategories: Category[];
  ResponseCode: string;
  ResponseCodeGrouping: string;
}

export interface BillersWithCategoriesResponse {
  BillerList: BillerList;
  ResponseCode: string;
  ResponseCodeGrouping: string;
}

export interface PaymentItem {
  Id: string;
  BillerId: number;
  BillerName: string;
  Amount: number;
  AmountType: number;
  AmountTypeDescription: string;
  PaymentCode: string;
  Name: string;
}

export interface PaymentItemsResponse {
  PaymentItems: PaymentItem[];
  ResponseCode: string;
  ResponseCodeGrouping: string;
}

export interface ValidateCustomersResponse {
  Customers: InterswitchCustomer[];
  ResponseCode: string;
  ResponseCodeGrouping: string;
}

export interface TransactionResponse {
  ResponseCode: string;
  ResponseCodeGrouping: "SUCCESSFUL" | "PENDING" | "FAILED";
  TransactionRef: string;
  ApprovedAmount: number;
  AdditionalInfo: Record<string, unknown>;
}

export interface ConfirmTransactionResponse {
  ResponseCode: string;
  ResponseCodeGrouping: "SUCCESSFUL" | "PENDING" | "FAILED";
  TransactionRef: string;
  ApprovedAmount: number;
  AdditionalInfo: Record<string, unknown>;
}

export interface InterswitchCustomer {
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
  ResponseDescription: string;
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
