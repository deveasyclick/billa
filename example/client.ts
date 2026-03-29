import * as dotenv from "dotenv";
import { InterswitchClient, VtpassClient, BillPayClient } from "../src";

dotenv.config();

const interswitchConfig = {
  clientId: process.env.INTERSWITCH_CLIENT_ID || "dummy_client_id",
  secretKey: process.env.INTERSWITCH_SECRET_KEY || "dummy_secret_key",
  terminalId: process.env.INTERSWITCH_TERMINAL_ID || "dummy_terminal_id",
  apiBaseUrl: process.env.INTERSWITCH_API_BASE_URL || "https://sandbox.quickteller.com",
  authUrl: process.env.INTERSWITCH_AUTH_URL || "https://sandbox.quickteller.com/api/v5/Auth/GetAccessToken",
  paymentBaseUrl: process.env.INTERSWITCH_PAYMENT_BASE_URL || "https://sandbox.quickteller.com",
  merchantCode: process.env.INTERSWITCH_MERCHANT_CODE || "dummy_merchant_code",
  paymentReferencePrefix: "BPY_",
};

const vtpassConfig = {
  apiKey: process.env.VTPASS_APIKEY || "dummy_api_key",
  secretKey: process.env.VTPASS_SECRET_KEY || "dummy_secret_key",
  apiBaseUrl: process.env.VTPASS_API_BASE_URL || "https://sandbox.vtpass.com/api",
  publicKey: process.env.VTPASS_PUBLIC_KEY || "dummy_public_key",
};

export const interswitchClient = new InterswitchClient({
  interswitch: interswitchConfig,
});

export const vtpassClient = new VtpassClient({
  vtpass: vtpassConfig,
});

export const billPayClient = new BillPayClient({
  interswitch: interswitchConfig,
  vtpass: vtpassConfig,
});
