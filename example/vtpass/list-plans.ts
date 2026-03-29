import { vtpassClient as client } from "../client";

async function main(): Promise<void> {

  try {
    console.log("Fetching VTpass plans for ELECTRICITY-BILL...");
    const plans = await client.getPlans({
      filters: { vtpass: { "ELECTRICITY-BILL": [] } },
    });
    console.log(`Found ${plans.length} plans.`);
    console.table(plans.slice(0, 5));
  } catch (err: unknown) {
    console.error("Error:", (err as Error).message);
  }
}

main().catch(console.error);
