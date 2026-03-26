import {
  Providers,
  type BillerItem,
  type BillPayCategory,
} from "../common/types";
import type { PayResponse, Customer } from "../common/types/interswitch";
import {
  InterSwitchService,
  type InterSwitchConfig,
} from "../integration/interswitch/interswitch.service";
import {
  VTPassService,
  type VTPassConfig,
} from "../integration/vtpass/vtpass.service";
import {
  BillPaymentProviderFactory,
  type ProviderType,
} from "../providers/bill-payment-provider.factory";
import { validateProvider } from "../common/utils/validate-provider";
import {
  type IBillPayClient,
  type PayRequest,
  type ValidateCustomerRequest,
  type GetPlansOptions,
} from "./IBillPayClient";

export interface BillPayClientConfig {
  /** configuration for the InterSwitch service; omit to disable that provider */
  interswitch?: InterSwitchConfig;
  /** configuration for the VTPass service; omit to disable that provider */
  vtpass?: VTPassConfig;
}

// TODO: Should this use providers instead of services?
export class BillPayClient implements IBillPayClient {
  private readonly interswitchService?: InterSwitchService;
  private readonly vtpassService?: VTPassService;
  private readonly factory: BillPaymentProviderFactory;
  private primaryProvider: ProviderType;
  private fallbackProvider: ProviderType | null;

  constructor(config: BillPayClientConfig) {
    // ensure at least one provider is supplied
    if (!config.interswitch && !config.vtpass) {
      throw new Error(
        "BillPayClient requires at least one of interswitch or vtpass configuration",
      );
    }

    if (config.interswitch) {
      this.interswitchService = new InterSwitchService(config.interswitch);
    }
    if (config.vtpass) {
      this.vtpassService = new VTPassService(config.vtpass);
    }

    this.factory = new BillPaymentProviderFactory(
      this.interswitchService,
      this.vtpassService,
    );

    // default provider preference: first available provider becomes primary
    if (this.interswitchService) {
      this.primaryProvider = "INTERSWITCH";
      this.fallbackProvider = this.vtpassService ? "VTPASS" : null;
    } else {
      // must have vtpassService because of earlier check
      this.primaryProvider = "VTPASS";
      this.fallbackProvider = null;
    }
  }

  /**
   * Set the provider preference for payment execution
   */
  setProviderPreference(
    primary: ProviderType,
    fallback?: ProviderType | null,
  ): void {
    const services = {
      interswitch: this.interswitchService,
      vtpass: this.vtpassService,
    };

    // validate requested providers are configured
    validateProvider(primary, services);
    if (fallback) {
      validateProvider(fallback, services);
    }

    this.primaryProvider = primary;
    this.fallbackProvider = fallback ?? null;
  }

  /**
   * Get the active provider preferences
   */
  getActiveProviders(): {
    primary: ProviderType;
    fallback: ProviderType | null;
  } {
    return {
      primary: this.primaryProvider,
      fallback: this.fallbackProvider,
    };
  }

  /**
   * Pay a bill with automatic fallback to secondary provider on failure
   */
  async pay(request: PayRequest): Promise<PayResponse> {
    // determine which provider(s) we will attempt
    const providerOverride = request.provider;
    const providersToTry: ProviderType[] = [];

    if (providerOverride) {
      // ensure override is available
      validateProvider(providerOverride, {
        interswitch: this.interswitchService,
        vtpass: this.vtpassService,
      });
      providersToTry.push(providerOverride);
    } else {
      providersToTry.push(this.primaryProvider);
      if (
        this.fallbackProvider &&
        this.fallbackProvider !== this.primaryProvider
      ) {
        providersToTry.push(this.fallbackProvider);
      }
    }

    return this.tryProviders(providersToTry, request);
  }

  /**
   * Validate customer information
   */
  async validateCustomer(request: ValidateCustomerRequest): Promise<Customer> {
    const provider = request.provider ?? this.primaryProvider;

    // ensure provider is configured
    validateProvider(provider, {
      interswitch: this.interswitchService,
      vtpass: this.vtpassService,
    });

    const providerInstance = this.factory.getProvider(provider);
    return providerInstance.validateCustomer(
      request.customerId,
      request.paymentCode,
      request.type,
    );
  }

  /**
   * Get available billing plans.
   */
  async getPlans(options?: GetPlansOptions): Promise<BillerItem[]> {
    const { provider, filters, forceRefresh, ttlMs, category } = options || {};

    const targetProvider = provider ?? this.primaryProvider;

    // logic to handle category filter if provided as a top-level option
    const activeFilters = { ...filters };
    if (category) {
      if (targetProvider === "INTERSWITCH" || targetProvider === "BOTH") {
        activeFilters.interswitch = {
          ...activeFilters.interswitch,
          [category]: [],
        };
      }
      if (targetProvider === "VTPASS" || targetProvider === "BOTH") {
        activeFilters.vtpass = { ...activeFilters.vtpass, [category]: [] };
      }
    }

    if (targetProvider === "BOTH") {
      const results: BillerItem[][] = [];
      if (this.interswitchService) {
        results.push(
          await this.interswitchService.getPlans({
            filters: activeFilters.interswitch,
            forceRefresh,
            ttlMs,
          }),
        );
      }
      if (this.vtpassService) {
        results.push(
          await this.vtpassService.getPlans({
            filters: activeFilters.vtpass,
            forceRefresh,
            ttlMs,
          }),
        );
      }
      return results.flat();
    }

    if (targetProvider === "INTERSWITCH") {
      validateProvider("INTERSWITCH", { interswitch: this.interswitchService });
      return this.interswitchService!.getPlans({
        filters: activeFilters.interswitch,
        forceRefresh,
        ttlMs,
      });
    }

    validateProvider("VTPASS", { vtpass: this.vtpassService });
    return this.vtpassService!.getPlans({
      filters: activeFilters.vtpass,
      forceRefresh,
      ttlMs,
    });
  }

  /**
   * Internal method: Try payment with multiple providers
   */
  private async tryProviders(
    providers: ProviderType[],
    request: PayRequest,
  ): Promise<PayResponse> {
    let lastError: any;

    for (const providerName of providers) {
      try {
        const providerInstance = this.factory.getProvider(providerName);
        const result = await providerInstance.executePayment(
          request.billerItem,
          {
            reference: request.paymentReference,
            amount: request.amount,
            customerId: request.customerId,
            plan: request.plan,
            id: request.billingItemId,
          },
        );

        // Success! Return immediately
        return result;
      } catch (err: unknown) {
        lastError = err;
        console.warn(
          `Payment via ${providerName} failed:`,
          (err as Error)?.message || err,
        );
        // Continue to next provider on failure
      }
    }

    // All providers failed
    throw new Error(
      `Payment failed across all providers. Last error: ${typeof lastError === "object" && lastError !== null && "message" in lastError ? (lastError as Error).message : lastError}`,
    );
  }

  /**
   * Get available bill categories.
   * If no provider is specified, returns categories from primary provider.
   * If provider is specified, returns categories from that provider only.
   * If provider is 'BOTH', returns combined unique categories from both providers.
   */
  async getCategories(
    provider?: ProviderType | "BOTH",
  ): Promise<BillPayCategory[]> {
    const targetProvider = provider ?? this.primaryProvider;

    if (targetProvider === "BOTH") {
      const results: BillPayCategory[][] = [];
      if (this.interswitchService) {
        const res = await this.interswitchService.getBillerCategories();
        results.push(
          (res.BillerCategories || []).map((cat) => ({
            name: cat.Name,
            provider: Providers.INTERSWITCH,
          })),
        );
      }

      if (this.vtpassService) {
        const res = await this.vtpassService.getCategories();
        results.push(
          (res.content || []).map((cat) => ({
            name: cat.identifier.toUpperCase(),
            provider: Providers.VTPASS,
          })),
        );
      }

      const allCategories = results.flat();
      // Remove duplicates by ID
      const seen = new Set<string>();
      return allCategories.filter((cat) => {
        if (seen.has(cat.name)) return false;
        seen.add(cat.name);
        return true;
      });
    }

    if (targetProvider === "INTERSWITCH") {
      validateProvider("INTERSWITCH", { interswitch: this.interswitchService });
      const res = await this.interswitchService!.getBillerCategories();
      return (res.BillerCategories || []).map((cat) => ({
        name: cat.Name,
        provider: Providers.INTERSWITCH,
      }));
    }

    // VTPASS path
    validateProvider("VTPASS", { vtpass: this.vtpassService });
    const res = await this.vtpassService!.getCategories();
    return (res.content || []).map((cat) => ({
      name: cat.identifier.toUpperCase(),
      provider: Providers.VTPASS,
    }));
  }
}
