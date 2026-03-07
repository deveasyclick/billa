import { IBillPaymentProvider } from "../common/interfaces/bill-payment-provider";
import { InterSwitchService } from "../integration/interswitch/interswitch.service";
import { VTPassService } from "../integration/vtpass/vtpass.service";
import { InterswitchProvider } from "./interswitch.provider";
import { VTPassProvider } from "./vtpass.provider";

export type ProviderType = "INTERSWITCH" | "VTPASS";

/**
 * Factory that constructs a provider wrapper around a configured service.
 *
 * Both services are optional; callers are responsible for providing at least
 * one of them when instantiating the class.  The factory will throw if a
 * provider is requested for which no service was supplied.
 */
export class BillPaymentProviderFactory {
  constructor(
    private readonly interswitchService?: InterSwitchService,
    private readonly vtpassService?: VTPassService,
  ) {}

  getProvider(providerName: ProviderType): IBillPaymentProvider {
    switch (providerName) {
      case "INTERSWITCH":
        if (!this.interswitchService) {
          throw new Error("INTERSWITCH provider not configured");
        }
        return new InterswitchProvider(this.interswitchService);
      case "VTPASS":
        if (!this.vtpassService) {
          throw new Error("VTPASS provider not configured");
        }
        return new VTPassProvider(this.vtpassService);
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  }
}
