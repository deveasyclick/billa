import { billaClient as client } from "../client";

async function main(): Promise<void> {

  // You can set provider preferences (e.g., Primary: INTERSWITCH, Fallback: VTPASS)
  client.setProviderPreference("INTERSWITCH", "VTPASS");
  console.log(
    "\n[1] Providers configured. Primary: INTERSWITCH, Fallback: VTPASS",
  );

  try {
    // -------------------------------------------------------------
    // Example 1: Fetching Billing Plans
    // -------------------------------------------------------------
    console.log("\n[2] Fetching plans from both providers...");
    try {
      const plans = await client.getPlans({
        provider: "BOTH",
        // filter by category and biller name
        filters: {
          vtpass: {
            "ELECTRICITY-BILL": ["Yola Electric Disco Payment - YEDC"],
          },
          interswitch: {
            "Cable TV Bills": ["DAARSAT Communications"],
          },
        },
      });
      console.log(`Successfully fetched ${plans.length} plans.`);

      const vtpassPlan = plans.find(
        (plan) =>
          plan.provider === "VTPASS" &&
          plan.category === "ELECTRICITY-BILL" &&
          plan.paymentCode === "prepaid",
      );
      const interswitchPlan = plans.find(
        (plan) => plan.provider === "INTERSWITCH",
      );

      if (!vtpassPlan) {
        throw new Error("No vtpass plan found");
      }

      if (!interswitchPlan) {
        throw new Error("No interswitch plan found");
      }

      const customerInfo = await client.validateCustomer({
        customerId: "1111111111111",
        paymentCode: vtpassPlan?.billerId,
        type: vtpassPlan.paymentCode,
        provider: "VTPASS",
      });

      const interswitchCustomerInfo = await client.validateCustomer({
        customerId: "01890003338",
        paymentCode: interswitchPlan.paymentCode,
        provider: "INTERSWITCH",
      });

      console.log("vtpass customer info", customerInfo);
      console.log("interswitch customer info", interswitchCustomerInfo);
    } catch (fetchErr: unknown) {
      console.log(`Validating customer failed: ${(fetchErr as Error).message}`);
    }
  } catch (err: unknown) {
    console.error("\n[Example Error]", (err as Error).message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
