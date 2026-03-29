import * as dotenv from "dotenv";
import { VtpassClient } from "../../src";

dotenv.config();

async function main(): Promise<void> {
  const client = new VtpassClient({
    vtpass: {
      apiKey: process.env.VTPASS_APIKEY || "dummy_api_key",
      secretKey: process.env.VTPASS_SECRET_KEY || "dummy_secret_key",
      apiBaseUrl: process.env.VTPASS_API_BASE_URL || "https://sandbox.vtpass.com/api",
      publicKey: process.env.VTPASS_PUBLIC_KEY || "dummy_public_key",
    },
  });

  try {
    const plans = await client.getPlans({ category: "ELECTRICITY-BILL" });
    const plan = plans.find(p => p.paymentCode === "prepaid");
    if (!plan) throw new Error("No prepaid plan found");

    console.log(`Validating customer for ${plan.billerName}...`);
    const customer = await client.validateCustomer({
      customerId: "1111111111111",
      paymentCode: plan.billerId,
      type: plan.paymentCode,
    });
    console.log("Customer Info:", customer);
  } catch (err: unknown) {
    console.error("Error:", (err as Error).message);
  }
}

main().catch(console.error);
