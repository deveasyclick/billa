export type { BillerItem } from "./biller-item";
export type { BillaCategory } from "./category";
export type { PayObject, ProviderResult, Customer, PayResponse } from "./payment";
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

export type {
  Category,
  Biller,
  BillerCategoryResponse,
  BillerCategoriesResponse,
  BillersWithCategoriesResponse,
  PaymentItem,
  PaymentItemsResponse,
  ValidateCustomersResponse,

  TransactionResponse,
  ConfirmTransactionResponse,
} from "./interswitch";

export const Providers = {
  INTERSWITCH: "INTERSWITCH",
  VTPASS: "VTPASS",
} as const;

export type Provider = (typeof Providers)[keyof typeof Providers];
