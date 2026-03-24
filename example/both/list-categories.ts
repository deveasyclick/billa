import { BillPayClient } from "../../src";

async function main() {
  console.log("==========================================");
  console.log("   BillPay SDK Integration Example        ");
  console.log("==========================================");

  // -------------------------------------------------------------
  // LISTING AVAILABLE CATEGORIES
  // -------------------------------------------------------------

  const client = new BillPayClient({
    interswitch: {
      clientId: process.env.INTERSWITCH_CLIENT_ID || "dummy_client_id",
      secretKey: process.env.INTERSWITCH_SECRET_KEY || "dummy_secret_key",
      terminalId: process.env.INTERSWITCH_TERMINAL_ID || "dummy_terminal_id",
      apiBaseUrl:
        process.env.INTERSWITCH_API_BASE_URL ||
        "https://sandbox.quickteller.com",
      authUrl:
        process.env.INTERSWITCH_AUTH_URL ||
        "https://sandbox.quickteller.com/api/v5/Auth/GetAccessToken",
      paymentBaseUrl:
        process.env.INTERSWITCH_PAYMENT_BASE_URL ||
        "https://sandbox.quickteller.com",
      merchantCode:
        process.env.INTERSWITCH_MERCHANT_CODE || "dummy_merchant_code",
      paymentReferencePrefix: "BPY_",
    },
    vtpass: {
      apiKey: process.env.VTPASS_APIKEY || "dummy_api_key",
      secretKey: process.env.VTPASS_SECRET_KEY || "dummy_secret_key",
      apiBaseUrl:
        process.env.VTPASS_API_BASE_URL || "https://sandbox.vtpass.com/api",
      publicKey: process.env.VTPASS_PUBLIC_KEY || "dummy_public_key",
    },
  });

  // You can set provider preferences (e.g., Primary: INTERSWITCH, Fallback: VTPASS)
  client.setProviderPreference("INTERSWITCH", "VTPASS");
  console.log(
    "\n[1] Providers configured. Primary: INTERSWITCH, Fallback: VTPASS",
  );

  try {
    console.log("\n[2] Fetching categories from both providers...");
    try {
      const categories = await client.listCategories("VTPASS");
      console.log("categories", categories);
    } catch (fetchErr: any) {
      console.log(`Listing categories failed: ${fetchErr.message}`);
    }
  } catch (err: any) {
    console.error("\n[Example Error]", err.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
