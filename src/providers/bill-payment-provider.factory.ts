import { IBillPaymentProvider } from "../common/interfaces/bill-payment-provider";
import { InterSwitchService } from "../integrations/interswitch/interswitch.service";
import { VTPassService } from "../integrations/vtpass/vtpass.service";
import { InterswitchProvider } from "./interswitch.provider";
import { VTPassProvider } from "./vtpass.provider";

export type ProviderType = "INTERSWITCH" | "VTPASS";

export class BillPaymentProviderFactory {
  private providers: Partial<Record<ProviderType, IBillPaymentProvider>> = {};
  constructor(
    private readonly interswitchService?: InterSwitchService,
    private readonly vtpassService?: VTPassService,
  ) {}

  getProvider(providerName: ProviderType): IBillPaymentProvider {
    if (this.providers[providerName]) {
      return this.providers[providerName]!;
    }

    let provider: IBillPaymentProvider;

    switch (providerName) {
      case "INTERSWITCH":
        if (!this.interswitchService) {
          throw new Error("INTERSWITCH provider not configured");
        }
        provider = new InterswitchProvider(this.interswitchService);
        break;

      case "VTPASS":
        if (!this.vtpassService) {
          throw new Error("VTPASS provider not configured");
        }
        provider = new VTPassProvider(this.vtpassService);
        break;

      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }

    this.providers[providerName] = provider;
    return provider;
  }
}
