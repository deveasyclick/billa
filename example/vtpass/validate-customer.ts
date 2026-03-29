import { vtpassClient as client } from "../client";

async function main(): Promise<void> {

  try {
    const plans = await client.getPlans({ filters: { "ELECTRICITY-BILL": [] } });
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
