export type { BillerItem } from "./biller-item";
export type { BillPayCategory } from "./category";
export type { PayObject, ProviderResult } from "./payment";
export type {
  VTPassVariation,
  GetVTPassVariationsResponse,
  VTPassCategory,
  GetVTPassCategoryResponse,
  VTPassService,
  GetVTPassServiceResponse,
  VTPassTransaction,
  VTPassTransactionResponse,
  VTPassCustomer,
  VTPassValidateCustomerResponse,
  VTPassVerifyCustomerPayload,
  VTPassVerifyMeterNoPayload,
  VTPassBuyAirtimePayload,
  VTPassBuyDataPayload,
  VTPassBuyTVPayload,
  VTPassBuyElectricityPayload,
  PayWithVtPassPayload,
  VTPassPayPayload,
} from "./vtpass";
export type { Customer } from "./interswitch";
export type {
  Category,
  Biller,
  BillerCategoryResponse,
  BillerCategoriesResponse,
  BillersWithCategoriesResponse,
  PaymentItem,
  PaymentItemsResponse,
  ValidateCustomersResponse,
  PayResponse,
  TransactionResponse,
  ConfirmTransactionResponse,
} from "./interswitch";

export const Providers = {
  INTERSWITCH: "INTERSWITCH",
  VTPASS: "VTPASS",
} as const;

export type Provider = (typeof Providers)[keyof typeof Providers];
