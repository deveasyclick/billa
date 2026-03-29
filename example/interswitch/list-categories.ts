import * as dotenv from "dotenv";
import { InterswitchClient } from "../../src";

dotenv.config();

async function main(): Promise<void> {
  const client = new InterswitchClient({
    interswitch: {
      clientId: process.env.INTERSWITCH_CLIENT_ID || "dummy_client_id",
      secretKey: process.env.INTERSWITCH_SECRET_KEY || "dummy_secret_key",
      terminalId: process.env.INTERSWITCH_TERMINAL_ID || "dummy_terminal_id",
      apiBaseUrl: process.env.INTERSWITCH_API_BASE_URL || "https://sandbox.quickteller.com",
      authUrl: process.env.INTERSWITCH_AUTH_URL || "https://sandbox.quickteller.com/api/v5/Auth/GetAccessToken",
      paymentBaseUrl: process.env.INTERSWITCH_PAYMENT_BASE_URL || "https://sandbox.quickteller.com",
      merchantCode: process.env.INTERSWITCH_MERCHANT_CODE || "dummy_merchant_code",
      paymentReferencePrefix: "BPY_",
    },
  });

  try {
    console.log("Fetching Interswitch categories...");
    const categories = await client.getCategories();
    console.table(categories);
  } catch (err: unknown) {
    console.error("Error:", (err as Error).message);
  }
}

main().catch(console.error);
