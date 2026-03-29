import { generateRequestId } from "../../src";
import { vtpassClient as client } from "../client";

/**
 * This example demonstrates the full lifecycle using VtpassClient:
 * 1. Fetching available plans
 * 2. Validating a customer for a specific plan
 * 3. Executing the payment
 * 4. Confirming the transaction status using confirmTransaction
 */
async function main(): Promise<void> {

  try {
    console.log("\n[1] Fetching plans...");
    const plans = await client.getPlans({
      filters: { vtpass: { "ELECTRICITY-BILL": [] } },
    });

    const plan = plans.find(p => p.paymentCode === "prepaid");
    if (!plan) {
      throw new Error("No prepaid electricity plans found for VTpass.");
    }

    console.log(`[2] Validating customer for ${plan.billerName}...`);
    const customer = await client.validateCustomer({
      customerId: "1111111111111",
      paymentCode: plan.billerId,
      type: plan.paymentCode,
    });

    console.log("[3] Executing payment...");
    const reference = generateRequestId();
    const payRes = await client.pay({
      reference,
      biller: plan.billerId,
      customerId: customer.customerId,
      amount: 1000,
      category: plan.category,
      paymentCode: plan.paymentCode,
      type: plan.paymentCode,
      provider: "VTPASS",
    });
    console.log("Payment Result:", payRes.status);

    console.log("[4] Confirming transaction...");
    const confirmation = await client.confirmTransaction(reference);
    console.log("Confirmation status:", confirmation.status);
    console.log("Metadata:", JSON.stringify(confirmation.metadata, null, 2));

  } catch (error: unknown) {
    const err = error as Error;
    console.error("\n[Example Error]", err.message);
    if ((err as any).response?.data) {
      console.error("API Error Details:", JSON.stringify((err as any).response.data, null, 2));
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
