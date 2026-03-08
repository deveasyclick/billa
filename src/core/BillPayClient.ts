import type { BillerItem } from "../common/types/biller-item";
import type { PayResponse, Customer } from "../common/types/interswitch";
import type { BillCategory } from "../common/types/vtpass";
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

export interface BillPayClientConfig {
  /** configuration for the InterSwitch service; omit to disable that provider */
  interswitch?: InterSwitchConfig;
  /** configuration for the VTPass service; omit to disable that provider */
  vtpass?: VTPassConfig;
}

export interface PayRequest {
  billingItemId: string;
  paymentReference: string;
  billerItem: BillerItem;
  customerId: string;
  amount: number;
  plan?: string;
  provider?: ProviderType;
}

export interface ValidateCustomerRequest {
  customerId: string;
  paymentCode: string;
  type?: string;
  provider?: ProviderType;
}

export class BillPayClient {
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
    // validate requested providers are configured
    if (primary === "INTERSWITCH" && !this.interswitchService) {
      throw new Error("INTERSWITCH provider is not configured");
    }
    if (primary === "VTPASS" && !this.vtpassService) {
      throw new Error("VTPASS provider is not configured");
    }
    if (fallback) {
      if (fallback === "INTERSWITCH" && !this.interswitchService) {
        throw new Error("INTERSWITCH provider is not configured");
      }
      if (fallback === "VTPASS" && !this.vtpassService) {
        throw new Error("VTPASS provider is not configured");
      }
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
      if (providerOverride === "INTERSWITCH" && !this.interswitchService) {
        throw new Error("INTERSWITCH provider is not configured");
      }
      if (providerOverride === "VTPASS" && !this.vtpassService) {
        throw new Error("VTPASS provider is not configured");
      }
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
    if (provider === "INTERSWITCH" && !this.interswitchService) {
      throw new Error("INTERSWITCH provider is not configured");
    }
    if (provider === "VTPASS" && !this.vtpassService) {
      throw new Error("VTPASS provider is not configured");
    }

    const providerInstance = this.factory.getProvider(provider);
    return providerInstance.validateCustomer(
      request.customerId,
      request.paymentCode,
      request.type,
    );
  }

  /**
   * Get available billing plans
   * If no provider is specified, returns plans from primary provider
   * If provider is specified, returns plans from that provider only
   * If provider is 'BOTH', returns combined plans from both providers
   */
  async getPlans(options?: {
    category?: BillCategory;
    provider?: ProviderType | "BOTH";
    filters?: Record<string, string[]>;
    forceRefresh?: boolean;
    ttlMs?: number;
  }): Promise<BillerItem[]> {
    const { category, provider, filters, forceRefresh, ttlMs } = options || {};

    const targetProvider = provider ?? this.primaryProvider;
    const serviceOpts = { filters, forceRefresh, ttlMs };

    // helper to filter categories if consumer passed `category`
    const filterCategory = (plans: BillerItem[]) =>
      category
        ? plans.filter(
            (p) => p.category.toUpperCase() === category.toUpperCase(),
          )
        : plans;

    if (targetProvider === "BOTH") {
      const results: BillerItem[][] = [];
      if (this.interswitchService) {
        results.push(await this.interswitchService.getPlans(serviceOpts));
      }
      if (this.vtpassService) {
        results.push(await this.vtpassService.getPlans(serviceOpts));
      }
      const allPlans = results.flat();
      return filterCategory(allPlans);
    }

    if (targetProvider === "INTERSWITCH") {
      if (!this.interswitchService) {
        throw new Error("INTERSWITCH provider is not configured");
      }
      return filterCategory(
        await this.interswitchService.getPlans(serviceOpts),
      );
    }

    // VTPASS path
    if (!this.vtpassService) {
      throw new Error("VTPASS provider is not configured");
    }
    return filterCategory(await this.vtpassService.getPlans(serviceOpts));
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
      } catch (err) {
        lastError = err;
        console.warn(
          `Payment via ${providerName} failed:`,
          (err as any)?.message || err,
        );
        // Continue to next provider on failure
      }
    }

    // All providers failed
    throw new Error(
      `Payment failed across all providers. Last error: ${lastError?.message || lastError}`,
    );
  }
}
