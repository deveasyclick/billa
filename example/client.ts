import * as dotenv from "dotenv";
import { BillaClient } from "../src";
import { InterswitchClient } from "../src/interswitch";
import { VtpassClient } from "../src/vtpass";

dotenv.config();

const interswitchConfig = {
  clientId: process.env.INTERSWITCH_CLIENT_ID || "dummy_client_id",
  secretKey: process.env.INTERSWITCH_SECRET_KEY || "dummy_secret_key",
  terminalId: process.env.INTERSWITCH_TERMINAL_ID || "dummy_terminal_id",
  apiBaseUrl:
    process.env.INTERSWITCH_API_BASE_URL || "https://sandbox.quickteller.com",
  authUrl:
    process.env.INTERSWITCH_AUTH_URL ||
    "https://sandbox.quickteller.com/api/v5/Auth/GetAccessToken",
  paymentReferencePrefix: "BPY_",
};

const vtpassConfig = {
  apiKey: process.env.VTPASS_APIKEY || "dummy_api_key",
  secretKey: process.env.VTPASS_SECRET_KEY || "dummy_secret_key",
  apiBaseUrl:
    process.env.VTPASS_API_BASE_URL || "https://sandbox.vtpass.com/api",
  publicKey: process.env.VTPASS_PUBLIC_KEY || "dummy_public_key",
  phone: process.env.VTPASS_PHONE || "+2348111111111",
};

export const interswitchClient = new InterswitchClient({
  interswitch: interswitchConfig,
});

export const vtpassClient = new VtpassClient({
  vtpass: vtpassConfig,
});

export const billaClient = new BillaClient({
  interswitch: interswitchConfig,
  vtpass: vtpassConfig,
});
