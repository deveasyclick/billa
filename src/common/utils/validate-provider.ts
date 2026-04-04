import type {
  InterSwitchApiClient,
  VTPassApiClient,
} from "../../integrations/index.js";
import type { ProviderType } from "../../providers/factory.js";

export function validateProvider(
  provider: ProviderType,
  services: { interswitch?: InterSwitchApiClient; vtpass?: VTPassApiClient },
): void {
  if (provider === "INTERSWITCH" && !services.interswitch) {
    throw new Error("INTERSWITCH provider is not configured");
  }
  if (provider === "VTPASS" && !services.vtpass) {
    throw new Error("VTPASS provider is not configured");
  }

  if (provider !== "VTPASS" && provider !== "INTERSWITCH") {
    throw new Error("Invalid provider");
  }
}
