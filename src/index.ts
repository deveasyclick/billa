import dotenv from "dotenv";

dotenv.config();

// Core client
export { BillaClient } from "./core/BillaClient";
export type {
  BillaClientConfig,
  PayRequest,
  ValidateCustomerRequest,
} from "./core";
export type { IBillPaymentProvider } from "./common/interfaces/bill-payment-provider";

// Common types and utilities
export type {
  BillerItem,
  PayObject,
  ProviderResult,
  BillaCategory,
  VTPassVariation,
  GetVTPassVariationsResponse,
  VTPassCategory,
  GetVTPassCategoryResponse,
  VTPassService as VTPassServiceType,
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
  Customer,
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
} from "./common/types";

// Provider implementations
export { BillPaymentProviderFactory } from "./providers/bill-payment-provider.factory";
export type { ProviderType } from "./providers/bill-payment-provider.factory";
export { InterswitchProvider } from "./providers/interswitch.provider";
export { VTPassProvider } from "./providers/vtpass.provider";

// Integration services
export { InterSwitchService } from "./integration/interswitch/interswitch.service";
export type { InterSwitchConfig } from "./integration/interswitch/interswitch.service";
export { VTPassService } from "./integration/vtpass/vtpass.service";
export type { VTPassConfig } from "./integration/vtpass/vtpass.service";

// utils
export { generateRequestId } from "./common/utils/generateRequestId";
