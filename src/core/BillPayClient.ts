import type { BillerItem } from '../common/types/biller-item';
import type { PayResponse, Customer } from '../common/types/interswitch';
import type { BillCategory } from '../common/types/vtpass';
import { InterSwitchService, type InterSwitchConfig } from '../integration/interswitch/interswitch.service';
import { VTPassService, type VTPassConfig } from '../integration/vtpass/vtpass.service';
import { BillPaymentProviderFactory, type ProviderType } from '../providers/bill-payment-provider.factory';

export interface IBillPaymentProvider {
  executePayment(
    item: BillerItem,
    payment: {
      reference: string;
      amount: number;
      customerId?: string;
      plan?: string;
      id?: string;
    },
  ): Promise<PayResponse>;

  validateCustomer(
    customerId: string,
    paymentCode: string,
    type?: string,
  ): Promise<Customer>;
}

export interface BillPayClientConfig {
  interswitch: InterSwitchConfig;
  vtpass: VTPassConfig;
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
  private readonly interswitchService: InterSwitchService;
  private readonly vtpassService: VTPassService;
  private readonly factory: BillPaymentProviderFactory;
  private primaryProvider: ProviderType = 'INTERSWITCH';
  private fallbackProvider: ProviderType | null = 'VTPASS';

  constructor(config: BillPayClientConfig) {
    this.interswitchService = new InterSwitchService(config.interswitch);
    this.vtpassService = new VTPassService(config.vtpass);
    this.factory = new BillPaymentProviderFactory(
      this.interswitchService,
      this.vtpassService,
    );
  }

  /**
   * Set the provider preference for payment execution
   */
  setProviderPreference(
    primary: ProviderType,
    fallback?: ProviderType | null,
  ): void {
    this.primaryProvider = primary;
    this.fallbackProvider = fallback ?? null;
  }

  /**
   * Get the active provider preferences
   */
  getActiveProviders(): { primary: ProviderType; fallback: ProviderType | null } {
    return {
      primary: this.primaryProvider,
      fallback: this.fallbackProvider,
    };
  }

  /**
   * Pay a bill with automatic fallback to secondary provider on failure
   */
  async pay(request: PayRequest): Promise<PayResponse> {
    const providersToTry: ProviderType[] = [
      request.provider ?? this.primaryProvider,
    ];

    // Add fallback provider if configured and different from primary
    if (this.fallbackProvider && providersToTry[0] !== this.fallbackProvider) {
      providersToTry.push(this.fallbackProvider);
    }

    return this.tryProviders(providersToTry, request);
  }

  /**
   * Validate customer information
   */
  async validateCustomer(
    request: ValidateCustomerRequest,
  ): Promise<Customer> {
    const provider = request.provider ?? this.primaryProvider;
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
  async getPlans(
    category?: BillCategory,
    provider?: ProviderType | 'BOTH',
  ): Promise<BillerItem[]> {
    const targetProvider = provider ?? this.primaryProvider;

    if (targetProvider === 'BOTH') {
      // Fetch and combine plans from both providers
      const [interswitchPlans, vtpassPlans] = await Promise.all([
        this.interswitchService.findPlans(),
        this.vtpassService.getPlans(),
      ]);
      const allPlans = [...interswitchPlans, ...vtpassPlans];

      if (category) {
        return allPlans.filter(
          (plan) => plan.category.toUpperCase() === category.toUpperCase(),
        );
      }

      return allPlans;
    }

    // Fetch plans from specific provider
    let plans: BillerItem[];
    if (targetProvider === 'INTERSWITCH') {
      plans = await this.interswitchService.findPlans();
    } else {
      plans = await this.vtpassService.getPlans();
    }

    // Filter by category if specified
    if (category) {
      return plans.filter(
        (plan) => plan.category.toUpperCase() === category.toUpperCase(),
      );
    }

    return plans;
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
