import { vtpassClient as client } from "../client";

async function main(): Promise<void> {

  try {
    console.log("Fetching VTpass categories...");
    const categories = await client.getCategories();
    console.table(categories);
  } catch (err: unknown) {
    console.error("Error:", (err as Error).message);
  }
}

main().catch(console.error);
