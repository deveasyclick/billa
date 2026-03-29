import * as dotenv from "dotenv";
import { InterswitchClient, generateRequestId } from "../../src";

dotenv.config();

/**
 * This example demonstrates the full lifecycle using InterswitchClient:
 * 1. Fetching available plans
 * 2. Validating a customer for a specific plan
 * 3. Executing the payment
 * 4. Confirming the transaction status using confirmTransaction
 */
async function main(): Promise<void> {
  console.log("==========================================");
  console.log("   Interswitch Client Confirmation Example ");
  console.log("==========================================");

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
    console.log("\n[1] Fetching plans...");
    const plans = await client.getPlans({
      filters: {
        interswitch: {
          "Cable TV Bills": ["DAARSAT Communications"],
        },
      },
    });

    const plan = plans[0];
    if (!plan) {
      throw new Error("No plans found for Interswitch.");
    }

    console.log(`[2] Validating customer for ${plan.billerName}...`);
    const customer = await client.validateCustomer({
      customerId: "01890003338",
      paymentCode: plan.paymentCode,
    });

    console.log("[3] Executing payment...");
    const reference = generateRequestId();
    const payRes = await client.pay({
      reference,
      biller: plan.billerId,
      customerId: customer.customerId,
      amount: customer.amount || 500,
      category: plan.category,
      paymentCode: plan.paymentCode,
      provider: "INTERSWITCH",
    });
    console.log("Payment Result:", payRes.status);

    console.log("[4] Confirming transaction...");
    const confirmation = await client.confirmTransaction(reference);
    console.log("Confirmation status:", confirmation.status);
    console.log("Metadata:", JSON.stringify(confirmation.metadata, null, 2));

  } catch (error: unknown) {
    const err = error as any;
    console.error("\n[Example Error]", err.message);
    if (err.response?.data) {
      console.error("API Error Details:", JSON.stringify(err.response.data, null, 2));
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
