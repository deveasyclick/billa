import * as dotenv from "dotenv";
import { VtpassClient, generateRequestId } from "../../src";

dotenv.config();

/**
 * This example demonstrates the full lifecycle using VtpassClient:
 * 1. Fetching available plans
 * 2. Validating a customer for a specific plan
 * 3. Executing the payment
 * 4. Confirming the transaction status using confirmTransaction
 */
async function main(): Promise<void> {
  console.log("==========================================");
  console.log("   VTpass Client Confirmation Example     ");
  console.log("==========================================");

  const client = new VtpassClient({
    vtpass: {
      apiKey: process.env.VTPASS_APIKEY || "dummy_api_key",
      secretKey: process.env.VTPASS_SECRET_KEY || "dummy_secret_key",
      apiBaseUrl: process.env.VTPASS_API_BASE_URL || "https://sandbox.vtpass.com/api",
      publicKey: process.env.VTPASS_PUBLIC_KEY || "dummy_public_key",
    },
  });

  try {
    console.log("\n[1] Fetching plans...");
    const plans = await client.getPlans({
      category: "ELECTRICITY-BILL",
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
