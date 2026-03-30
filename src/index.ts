import dotenv from "dotenv";

dotenv.config();

// Core client
export { BillaClient } from "./clients/BillaClient.js";
export type {
  BillaClientConfig,
  PayRequest,
  ValidateCustomerRequest,
} from "./clients/index.js";
export type { IBillPaymentProvider } from "./common/interfaces/bill-payment-provider.js";

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
} from "./common/types/index.js";

// Provider implementations
export { BillPaymentProviderFactory } from "./providers/bill-payment-provider.factory.js";
export type { ProviderType } from "./providers/bill-payment-provider.factory.js";
export { InterswitchProvider } from "./providers/interswitch.provider.js";
export { VTPassProvider } from "./providers/vtpass.provider.js";

// Integration services
export { InterSwitchService } from "./integrations/interswitch/index.js";
export type { InterSwitchConfig } from "./integrations/interswitch/index.js";
export { VTPassService } from "./integrations/vtpass/index.js";
export type { VTPassConfig } from "./integrations/vtpass/index.js";

// utils
export { generateRequestId } from "./common/utils/generateRequestId.js";
