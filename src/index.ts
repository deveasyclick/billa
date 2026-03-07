// Core client
export { BillPayClient } from './core/BillPayClient';
export type {
  BillPayClientConfig,
  PayRequest,
  ValidateCustomerRequest,
  IBillPaymentProvider,
} from './core';

// Common types and utilities
export type {
  BillerItem,
  PayObject,
  ProviderResult,
  BillCategory,
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
  ConfirmCardPaymentResponse,
  TransactionResponse,
  ConfirmTransactionResponse,
} from './common/types';

export {
  SUPPORTED_BILLERS,
  SUPPORTED_ELECTRICITY_PROVIDERS,
  SUPPORTED_BILL_ITEMS,
} from './common/constants/biller';

export {
  getStaticInternalCode,
  isStaticCategory,
} from './common/utils/static-codes';

// Provider implementations  
export { BillPaymentProviderFactory } from './providers/bill-payment-provider.factory';
export type { ProviderType } from './providers/bill-payment-provider.factory';
export { InterswitchProvider } from './providers/interswitch.provider';
export { VTPassProvider } from './providers/vtpass.provider';

// Integration services
export { InterSwitchService } from './integration/interswitch/interswitch.service';
export type { InterSwitchConfig } from './integration/interswitch/interswitch.service';
export { VTPassService } from './integration/vtpass/vtpass.service';
export type { VTPassConfig } from './integration/vtpass/vtpass.service';
export { STATIC_BILL_ITEMS } from './integration/vtpass/vtpass.constants';
