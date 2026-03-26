import { BillPayClient } from "../../src";

async function main() {
  console.log("==========================================");
  console.log("   BillPay SDK Integration Example        ");
  console.log("==========================================");

  // Initialize the main client with both InterSwitch and VTPass
  // In a real application, you would use actual environment variables here.
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
    // -------------------------------------------------------------
    // Example 1: Fetching Billing Plans
    // -------------------------------------------------------------
    console.log("\n[2] Fetching plans from both providers...");
    try {
      const plans = await client.getPlans({
        provider: "BOTH",
        // filter by category and biller name
        filters: {
          vtpass: {
            "ELECTRICITY-BILL": ["Yola Electric Disco Payment - YEDC"],
          },
          interswitch: {
            "Cable TV Bills": ["DAARSAT Communications"],
          },
        },
      });
      console.log(`Successfully fetched ${plans.length} plans.`);

      const vtpassPlan = plans.find(
        (plan) =>
          plan.provider === "VTPASS" &&
          plan.category === "ELECTRICITY-BILL" &&
          plan.type === "prepaid",
      );
      const interswitchPlan = plans.find(
        (plan) => plan.provider === "INTERSWITCH",
      );

      if (!vtpassPlan) {
        throw new Error("No vtpass plan found");
      }

      if (!interswitchPlan) {
        throw new Error("No interswitch plan found");
      }

      const customerInfo = await client.validateCustomer({
        customerId: "1111111111111",
        paymentCode: vtpassPlan?.paymentCode,
        type: vtpassPlan.type,
        provider: "VTPASS",
      });

      const interswitchCustomerInfo = await client.validateCustomer({
        customerId: "01890003338",
        paymentCode: interswitchPlan.paymentCode,
        provider: "INTERSWITCH",
      });

      console.log("vtpass customer info", customerInfo);
      console.log("interswitch customer info", interswitchCustomerInfo);
    } catch (fetchErr: any) {
      console.log(`Validating customer failed: ${fetchErr.message}`);
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
