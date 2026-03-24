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
    console.log(
      "\n[2] Fetching plans from both providers... (This may fail with dummy credentials)",
    );
    try {
      const categories = await client.listCategories("BOTH");
      console.log("categories", categories);

      // const plans = await client.getPlans({
      //   provider: "BOTH",
      //   filters: {
      //     vtpass: { "Mobile/Recharge": [] },
      //     interswitch: { "Mobile/Recharge": [] },
      //   },
      // });
      // console.log(`Successfully fetched ${plans.length} airtime plans.`);
      // console.log(plans.length, plans);

      // if (plans.length > 0) {
      //   // Pick a sample plan for demonstration
      //   const samplePlan = plans[0];
      //   console.log(
      //     `    Sample Plan: ${samplePlan.billerName} - ${samplePlan.name} (${samplePlan.amount / 100} NGN)`,
      //   );

      //   const customerId = "08012345678"; // Example phone number

      //   // -------------------------------------------------------------
      //   // Example 2: Validating Customer
      //   // -------------------------------------------------------------
      //   console.log(`\n[3] Validating customer ${customerId}...`);
      //   try {
      //     const customerInfo = await client.validateCustomer({
      //       customerId,
      //       paymentCode: samplePlan.paymentCode,
      //     });
      //     console.log("    Customer Validation Result:", customerInfo);
      //   } catch (validationErr: any) {
      //     console.log(
      //       `    Customer validation skipped or failed: ${validationErr.message}`,
      //     );
      //   }

      //   // -------------------------------------------------------------
      //   // Example 3: Processing a Payment
      //   // -------------------------------------------------------------
      //   const paymentReference = `REF_${Date.now()}`;
      //   console.log(
      //     `\n[4] Initiating payment for ${samplePlan.billerName}... (Ref: ${paymentReference})`,
      //   );

      //   try {
      //     const paymentResult = await client.pay({
      //       billingItemId: samplePlan.internalCode,
      //       paymentReference,
      //       billerItem: samplePlan,
      //       customerId,
      //       amount: samplePlan.amount || 10000,
      //     });

      //     console.log("    Payment Result:");
      //     console.log(paymentResult);
      //   } catch (paymentErr: any) {
      //     console.log(
      //       `    Payment simulation failed (expected with dummy credentials): ${paymentErr.message}`,
      //     );
      //   }
      // }
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
