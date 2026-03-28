import * as dotenv from "dotenv";
import { BillPayClient, generateRequestId } from "../../src";

dotenv.config();

/**
 * This example demonstrates the full lifecycle of a bill payment:
 * 1. Fetching available plans
 * 2. Validating a customer for a specific plan
 * 3. Executing the payment
 * 4. Confirming the transaction status using confirmTransaction
 */
async function main() {
  console.log("==========================================");
  console.log("   BillPay SDK Confirm Transaction Example ");
  console.log("==========================================");

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

  try {
    console.log("\n[1] Fetching plans...");
    const plans = await client.getPlans({
      provider: "BOTH",
      filters: {
        vtpass: { "ELECTRICITY-BILL": ["Yola Electric Disco Payment - YEDC"] },
        interswitch: { "Cable TV Bills": ["DAARSAT Communications"] },
      },
    });

    const vtpassPlan = plans.find(
      (p) => p.provider === "VTPASS" && p.paymentCode === "prepaid",
    );
    const interswitchPlan = plans.find((p) => p.provider === "INTERSWITCH");

    if (!vtpassPlan || !interswitchPlan) {
      throw new Error("Could not find required plans for the example.");
    }

    // --- VTpass Flow ---
    console.log("\n--- VTpass Transaction Flow ---");
    console.log("[2] Validating VTpass customer...");
    const vtpassCustomer = await client.validateCustomer({
      customerId: "1111111111111",
      paymentCode: vtpassPlan.billerId,
      type: vtpassPlan.paymentCode,
      provider: "VTPASS",
    });

    console.log("[3] Executing VTpass payment...");
    const vtpassRef = generateRequestId();
    const vtpassPayRes = await client.pay({
      reference: vtpassRef,
      biller: vtpassPlan.billerId,
      customerId: vtpassCustomer.customerId,
      amount: 1000,
      provider: "VTPASS",
      category: vtpassPlan.category,
      paymentCode: vtpassPlan.paymentCode,
      type: vtpassPlan.paymentCode,
    });
    console.log("Payment Result:", vtpassPayRes.status);

    console.log("[4] Confirming VTpass transaction...");
    const vtpassConfirm = await client.confirmTransaction(vtpassRef, "VTPASS");
    console.log("Confirmation status:", vtpassConfirm.status);
    console.log(
      "Confirmation Metadata:",
      JSON.stringify(vtpassConfirm.metadata, null, 2),
    );

    // --- Interswitch Flow ---
    console.log("\n--- Interswitch Transaction Flow ---");
    console.log("[2] Validating Interswitch customer...");
    const isCustomer = await client.validateCustomer({
      customerId: "01890003338",
      paymentCode: interswitchPlan.paymentCode,
      provider: "INTERSWITCH",
    });

    console.log("[3] Executing Interswitch payment...");
    const isRef = generateRequestId();
    const isPayRes = await client.pay({
      reference: isRef,
      biller: interswitchPlan.billerId,
      customerId: isCustomer.customerId,
      amount: isCustomer.amount || 500,
      provider: "INTERSWITCH",
      category: interswitchPlan.category,
      paymentCode: interswitchPlan.paymentCode,
    });
    console.log("Payment Result:", isPayRes.status);

    console.log("[4] Confirming Interswitch transaction...");
    const isConfirm = await client.confirmTransaction(isRef, "INTERSWITCH");
    console.log("Confirmation status:", isConfirm.status);
    console.log(
      "Confirmation Metadata:",
      JSON.stringify(isConfirm.metadata, null, 2),
    );
  } catch (error: any) {
    console.error("\n[Example Error]", error.message);
    if (error.response?.data) {
      console.error(
        "API Error Details:",
        JSON.stringify(error.response.data, null, 2),
      );
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
