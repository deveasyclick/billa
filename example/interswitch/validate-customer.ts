import { interswitchClient as client } from "../client";

async function main(): Promise<void> {

  try {
    const plans = await client.getPlans({
      filters: { "Cable TV Bills": ["DAARSAT Communications"] },
    });
    const plan = plans[0];
    if (!plan) throw new Error("No plans found");

    console.log(`Validating customer for ${plan.billerName}...`);
    const customer = await client.validateCustomer({
      customerId: "01890003338",
      paymentCode: plan.paymentCode,
    });
    console.log("Customer Info:", customer);
  } catch (err: unknown) {
    console.error("Error:", (err as Error).message);
  }
}

main().catch(console.error);
