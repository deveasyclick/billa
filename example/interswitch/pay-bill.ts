import { generateRequestId } from "../../src";
import { interswitchClient as client } from "../client";

async function main(): Promise<void> {

  try {
    const plans = await client.getPlans({
        filters: {
          "Cable TV Bills": ["DAARSAT Communications"],
        },
    });
    const plan = plans[0];
    if (!plan) throw new Error("No plans found");

    const customer = await client.validateCustomer({
      customerId: "01890003338",
      paymentCode: plan.paymentCode,
    });

    console.log("Initiating payment...");
    const result = await client.pay({
      reference: generateRequestId(),
      biller: plan.billerId,
      customerId: customer.customerId,
      amount: customer.amount || 500,
      category: plan.category,
      paymentCode: plan.paymentCode,
      provider: "INTERSWITCH",
    });
    console.log("Payment Result:", result);
  } catch (err: unknown) {
    console.error("Error:", (err as Error).message);
  }
}

main().catch(console.error);
