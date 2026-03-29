import { generateRequestId } from "../../src";
import { vtpassClient as client } from "../client";

async function main(): Promise<void> {

  try {
    const plans = await client.getPlans({ category: "ELECTRICITY-BILL" });
    const plan = plans.find(p => p.paymentCode === "prepaid");
    if (!plan) throw new Error("No prepaid plan found");

    const customer = await client.validateCustomer({
      customerId: "1111111111111",
      paymentCode: plan.billerId,
      type: plan.paymentCode,
    });

    console.log("Initiating payment...");
    const result = await client.pay({
      reference: generateRequestId(),
      biller: plan.billerId,
      customerId: customer.customerId,
      amount: 1000,
      category: plan.category,
      paymentCode: plan.paymentCode,
      type: plan.paymentCode,
      provider: "VTPASS",
    });
    console.log("Payment Result:", result);
  } catch (err: unknown) {
    console.error("Error:", (err as Error).message);
  }
}

main().catch(console.error);
