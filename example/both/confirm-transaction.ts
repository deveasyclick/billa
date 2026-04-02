import { generateRequestId } from "../../src";
import { billpayClient as client } from "../client";

/**
 * This example demonstrates the full lifecycle of a bill payment:
 * 1. Fetching available plans
 * 2. Validating a customer for a specific plan
 * 3. Executing the payment
 * 4. Confirming the transaction status using confirmTransaction
 */
async function main(): Promise<void> {
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
  } catch (error: unknown) {
    const err = error as Error;
    console.error("\n[Example Error]", err.message);
    if ((err as any).response?.data) {
      console.error(
        "API Error Details:",
        JSON.stringify((err as any).response.data, null, 2),
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
