import type { BillerItem, BillpayCategory } from "../common/types/index.js";
import {
  InterSwitchService,
  type InterSwitchConfig,
} from "../integrations/interswitch/index.js";
import {
  VTPassService,
  type VTPassConfig,
} from "../integrations/vtpass/index.js";
import {
  BillPaymentProviderFactory,
  type ProviderType,
  type ProviderTarget,
} from "../providers/bill-payment-provider.factory.js";
import { InterswitchProvider } from "../providers/interswitch.provider.js";
import { VTPassProvider } from "../providers/vtpass.provider.js";
import type { IBillPaymentProvider } from "../common/interfaces/bill-payment-provider.js";
import {
  type IBillpayClient,
  type PayRequest,
  type ValidateCustomerRequest,
  type GetPlansOptions,
} from "./IBillpayClient.js";
import type { Customer, PayResponse } from "../common/types/payment.js";

export interface BillpayClientConfig {
  /** configuration for the InterSwitch service; omit to disable that provider */
  interswitch?: InterSwitchConfig;
  /** configuration for the VTPass service; omit to disable that provider */
  vtpass?: VTPassConfig;
}

export class BillpayClient implements IBillpayClient {
  private readonly interswitchService?: InterSwitchService;
  private readonly vtpassService?: VTPassService;
  private readonly factory: BillPaymentProviderFactory;
  private primaryProvider: ProviderType;
  private fallbackProvider: ProviderType | null;

  constructor(config: BillpayClientConfig) {
    // ensure at least one provider is supplied
    if (!config.interswitch && !config.vtpass) {
      throw new Error(
        "BillpayClient requires at least one of interswitch or vtpass configuration",
      );
    }

    if (config.interswitch) {
      this.interswitchService = new InterSwitchService(config.interswitch);
    }
    if (config.vtpass) {
      this.vtpassService = new VTPassService(config.vtpass);
    }

    this.factory = new BillPaymentProviderFactory();
    if (this.interswitchService) {
      this.factory.register(
        "INTERSWITCH",
        new InterswitchProvider(this.interswitchService),
      );
    }
    if (this.vtpassService) {
      this.factory.register("VTPASS", new VTPassProvider(this.vtpassService));
    }

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
    // The factory will throw if provider is not configured
    this.factory.getProvider(primary);
    if (fallback) {
      this.factory.getProvider(fallback);
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
   * Generic method to handle provider routing for read operations that support "BOTH"
   */
  private async forProvider<T>(
    target: ProviderTarget,
    fn: (provider: IBillPaymentProvider) => Promise<T[]>,
  ): Promise<T[]> {
    if (target === "BOTH") {
      const results = await Promise.all(
        this.availableProviders().map((p) => fn(this.factory.getProvider(p))),
      );
      return results.flat();
    }
    return fn(this.factory.getProvider(target));
  }

  /**
   * Get available providers that are configured
   */
  private availableProviders(): ProviderType[] {
    const providers: ProviderType[] = [];
    if (this.interswitchService) providers.push("INTERSWITCH");
    if (this.vtpassService) providers.push("VTPASS");
    return providers;
  }

  /**
   * Pay a bill with automatic fallback to secondary provider on failure
   */
  async payWithFailover(request: PayRequest): Promise<PayResponse> {
    // determine which provider(s) we will attempt
    const providerOverride = request.provider;
    const providersToTry: ProviderType[] = [];

    if (providerOverride) {
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
   * Pay without failover
   */
  async pay(request: PayRequest): Promise<PayResponse> {
    const provider = request.provider ?? this.primaryProvider;
    try {
      const providerInstance = this.factory.getProvider(provider);
      const result = await providerInstance.pay(request);

      // Success! Return immediately
      return result;
    } catch (err: unknown) {
      const errorMessage =
        (err as { response?: { data?: unknown } })?.response?.data ||
        (err as Error)?.message ||
        err;
      console.warn(`Payment via ${provider} failed:`, errorMessage);
      throw errorMessage;
    }
  }
  /**
   * Validate customer information
   */
  async validateCustomer(request: ValidateCustomerRequest): Promise<Customer> {
    const provider = request.provider ?? this.primaryProvider;
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
      const results = await Promise.all(
        this.availableProviders().map((p) =>
          this.factory.getProvider(p).listPlans({
            filters:
              p === "INTERSWITCH" ? filters?.interswitch : filters?.vtpass,
          }),
        ),
      );
      return results.flat();
    }

    return this.factory.getProvider(targetProvider).listPlans({
      filters: filters?.interswitch || filters?.vtpass,
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
  async getCategories(provider?: ProviderTarget): Promise<BillpayCategory[]> {
    const targetProvider = provider ?? this.primaryProvider;

    const results = await this.forProvider(targetProvider, (p) =>
      p.listCategories(),
    );

    // Deduplicate categories by name
    const seen = new Set<string>();
    return results.filter((cat) => {
      if (seen.has(cat.name)) return false;
      seen.add(cat.name);
      return true;
    });
  }

  /**
   * Confirm/Requery a transaction.
   */
  async confirmTransaction(
    reference: string,
    provider?: ProviderType,
  ): Promise<PayResponse> {
    const targetProvider = provider ?? this.primaryProvider;
    const providerInstance = this.factory.getProvider(targetProvider);
    return providerInstance.confirm(reference);
  }
}
