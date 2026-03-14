import { InterswitchClient } from "../src";

async function main() {
  console.log("==========================================");
  console.log("   Interswitch Client Example             ");
  console.log("==========================================");

  try {
    const interswitchClient = new InterswitchClient({
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
    });
    console.log("    Interswitch client initialized successfully.");

    console.log("    Fetching plans from Interswitch... (This may fail with dummy credentials)");
    try {
      // For single provider clients, the first argument to getPlans is just the category or options
      const interswitchPlans = await interswitchClient.getPlans({ category: "ELECTRICITY" });
      console.log(`    Successfully fetched ${interswitchPlans.length} electricity plans from Interswitch.`);
    } catch (fetchErr: any) {
      console.log(
        `    Fetching plans failed (expected with dummy credentials): ${fetchErr.message}`,
      );
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
