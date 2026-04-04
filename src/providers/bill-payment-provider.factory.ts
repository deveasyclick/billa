import { IBillPaymentProvider } from "../common/interfaces/bill-payment-provider.js";

export type ProviderType = "INTERSWITCH" | "VTPASS";
export type ProviderTarget = ProviderType | "BOTH";

export class BillPaymentProviderFactory {
  private readonly services = new Map<ProviderType, IBillPaymentProvider>();

  register(name: ProviderType, provider: IBillPaymentProvider): this {
    this.services.set(name, provider);
    return this;
  }

  getProvider(name: ProviderType): IBillPaymentProvider {
    const p = this.services.get(name);
    if (!p) throw new Error(`Provider ${name} not configured`);
    return p;
  }
}
