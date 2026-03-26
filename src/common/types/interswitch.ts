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

export interface PayResponse {
  paymentRef: string;
  amount: number;
  metadata: Record<string, any>;
  status: string;
}

export interface TransactionResponse {
  ResponseCode: string;
  ResponseCodeGrouping: string;
  TransactionRef: {
    Reference: string;
    ReferenceNumber: number;
  };
  Amount: number;
}

export interface ConfirmTransactionResponse {
  ResponseCode: string;
  ResponseCodeGrouping: string;
  Amount: number;
  TransactionRef: {
    Reference: string;
    ReferenceNumber: number;
  };
  IsSuccessful: boolean;
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
