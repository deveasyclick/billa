import { billpayClient as client } from "../client";

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
            "ELECTRICITY-BILL": [],
          },
          interswitch: {
            "Products and Services": ["Momall, A Division Of Media 24"],
          },
        },
      });
      console.log(`Successfully fetched ${plans.length} airtime plans.`);
      console.log(plans.length, plans);
    } catch (fetchErr: unknown) {
      console.log(`Fetching plans failed: ${(fetchErr as Error).message}`);
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
