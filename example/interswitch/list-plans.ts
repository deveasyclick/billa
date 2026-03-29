import { interswitchClient as client } from "../client";

async function main(): Promise<void> {

  try {
    console.log("Fetching Interswitch plans...");
    const plans = await client.getPlans({
      filters: {
        interswitch: {
          "Cable TV Bills": ["DAARSAT Communications"],
        },
      },
    });
    console.log(`Found ${plans.length} plans.`);
    console.table(plans.slice(0, 5));
  } catch (err: unknown) {
    console.error("Error:", (err as Error).message);
  }
}

main().catch(console.error);
