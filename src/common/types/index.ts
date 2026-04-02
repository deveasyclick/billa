export type { BillerItem } from "./biller-item.js";
export type { BillpayCategory } from "./category.js";
export type {
  PayObject,
  ProviderResult,
  Customer,
  PayResponse,
} from "./payment.js";
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
} from "./vtpass.js";

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
} from "./interswitch.js";

export const Providers = {
  INTERSWITCH: "INTERSWITCH",
  VTPASS: "VTPASS",
} as const;

export type Provider = (typeof Providers)[keyof typeof Providers];
