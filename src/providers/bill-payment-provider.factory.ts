import { IBillPaymentProvider } from '../common/interfaces/bill-payment-provider';
import { InterSwitchService } from '../integration/interswitch/interswitch.service';
import { VTPassService } from '../integration/vtpass/vtpass.service';
import { InterswitchProvider } from './interswitch.provider';
import { VTPassProvider } from './vtpass.provider';

export type ProviderType = 'INTERSWITCH' | 'VTPASS';

export class BillPaymentProviderFactory {
  constructor(
    private readonly interswitchService: InterSwitchService,
    private readonly vtpassService: VTPassService,
  ) {}

  getProvider(providerName: ProviderType): IBillPaymentProvider {
    switch (providerName) {
      case 'INTERSWITCH':
        return new InterswitchProvider(this.interswitchService);
      case 'VTPASS':
        return new VTPassProvider(this.vtpassService);
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  }
}
