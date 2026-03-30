import { generateRequestId } from "../../src";
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

      // TODO: pass vtpaddPlan object to validate customer
      const customerInfo = await client.validateCustomer({
        customerId: "1111111111111",
        paymentCode: vtpassPlan?.billerId,
        type: vtpassPlan.paymentCode,
        provider: vtpassPlan.provider,
      });

      const interswitchCustomerInfo = await client.validateCustomer({
        customerId: "01890003338",
        paymentCode: interswitchPlan.paymentCode,
        provider: interswitchPlan.provider,
      });

      console.log("vtpass customer info", customerInfo);
      console.log("interswitch customer info", interswitchCustomerInfo);

      const interswitchTx = await client.pay({
        reference: generateRequestId(),
        biller: interswitchPlan.billerId,
        customerId: interswitchCustomerInfo.customerId,
        amount: interswitchCustomerInfo.amount!,
        provider: interswitchPlan.provider,
        category: interswitchPlan.category,
        paymentCode: interswitchPlan.paymentCode,
      });

      const vtpassTx = await client.pay({
        reference: generateRequestId(),
        biller: vtpassPlan.billerId,
        customerId: customerInfo.customerId,
        amount: 1000,
        provider: vtpassPlan.provider,
        category: vtpassPlan.category,
        paymentCode: vtpassPlan.paymentCode,
      });
      console.log("interswitch transaction", interswitchTx);
      console.log("vtpass transaction", vtpassTx);
    } catch (fetchErr: unknown) {
      console.log(`Payment failed: ${(fetchErr as Error).message}`, fetchErr);
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
