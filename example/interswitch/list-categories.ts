import { interswitchClient as client } from "../client";

async function main(): Promise<void> {

  try {
    console.log("Fetching Interswitch categories...");
    const categories = await client.getCategories();
    console.table(categories);
  } catch (err: unknown) {
    console.error("Error:", (err as Error).message);
  }
}

main().catch(console.error);
