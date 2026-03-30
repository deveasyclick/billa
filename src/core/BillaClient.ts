import {
  Providers,
  type BillerItem,
  type BillaCategory,
} from "../common/types";
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
  type IBillaClient,
  type PayRequest,
  type ValidateCustomerRequest,
  type GetPlansOptions,
} from "./IBillaClient";
import type { Customer, PayResponse } from "../common/types/payment";

export interface BillaClientConfig {
  /** configuration for the InterSwitch service; omit to disable that provider */
  interswitch?: InterSwitchConfig;
  /** configuration for the VTPass service; omit to disable that provider */
  vtpass?: VTPassConfig;
}

export class BillaClient implements IBillaClient {
  private readonly interswitchService?: InterSwitchService;
  private readonly vtpassService?: VTPassService;
  private readonly factory: BillPaymentProviderFactory;
  private primaryProvider: ProviderType;
  private fallbackProvider: ProviderType | null;

  constructor(config: BillaClientConfig) {
    // ensure at least one provider is supplied
    if (!config.interswitch && !config.vtpass) {
      throw new Error(
        "BillaClient requires at least one of interswitch or vtpass configuration",
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
    const { provider, filters } = options || {};

    const targetProvider = provider ?? this.primaryProvider;

    if (targetProvider === "BOTH") {
      const results: BillerItem[][] = [];
      if (this.interswitchService) {
        results.push(
          await this.factory.getProvider(Providers.INTERSWITCH).listPlans({
            filters: filters?.interswitch,
          }),
        );
      }
      if (this.vtpassService) {
        results.push(
          await this.factory.getProvider(Providers.VTPASS).listPlans({
            filters: filters?.vtpass,
          }),
        );
      }
      return results.flat();
    }

    if (targetProvider === "INTERSWITCH") {
      validateProvider("INTERSWITCH", { interswitch: this.interswitchService });
      return this.factory.getProvider(Providers.INTERSWITCH).listPlans({
        filters: filters?.interswitch,
      });
    }

    validateProvider("VTPASS", { vtpass: this.vtpassService });
    return this.factory.getProvider(Providers.VTPASS).listPlans({
      filters: filters?.vtpass,
    });
  }

  /**
   * Internal method: Try payment with multiple providers
   */
  private async tryProviders(
    providers: ProviderType[],
    request: PayRequest,
  ): Promise<PayResponse> {
    let lastError: unknown;

    for (const providerName of providers) {
      try {
        const providerInstance = this.factory.getProvider(providerName);
        const result = await providerInstance.pay(request);

        // Success! Return immediately
        return result;
      } catch (err: unknown) {
        lastError = err;
        const errorMessage =
          (err as { response?: { data?: unknown } })?.response?.data ||
          (err as Error)?.message ||
          err;
        console.warn(`Payment via ${providerName} failed:`, errorMessage);
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
  ): Promise<BillaCategory[]> {
    const targetProvider = provider ?? this.primaryProvider;

    if (targetProvider === "BOTH") {
      const results: BillaCategory[][] = [];
      if (this.interswitchService) {
        results.push(
          await this.factory
            .getProvider(Providers.INTERSWITCH)
            .listCategories(),
        );
      }

      if (this.vtpassService) {
        results.push(
          await this.factory.getProvider(Providers.VTPASS).listCategories(),
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
      return this.factory.getProvider(Providers.INTERSWITCH).listCategories();
    }

    // VTPASS path
    validateProvider("VTPASS", { vtpass: this.vtpassService });
    return this.factory.getProvider(Providers.VTPASS).listCategories();
  }

  /**
   * Confirm/Requery a transaction.
   */
  async confirmTransaction(
    reference: string,
    provider?: ProviderType,
  ): Promise<PayResponse> {
    const targetProvider = provider ?? this.primaryProvider;

    validateProvider(targetProvider, {
      interswitch: this.interswitchService,
      vtpass: this.vtpassService,
    });

    const providerInstance = this.factory.getProvider(targetProvider);
    return providerInstance.confirm(reference);
  }
}
