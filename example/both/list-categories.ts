import { billPayClient as client } from "../client";

async function main(): Promise<void> {

  // You can set provider preferences (e.g., Primary: INTERSWITCH, Fallback: VTPASS)
  client.setProviderPreference("INTERSWITCH", "VTPASS");
  console.log(
    "\n[1] Providers configured. Primary: INTERSWITCH, Fallback: VTPASS",
  );

  try {
    console.log("\n[2] Fetching categories from both providers...");
    try {
      const categories = await client.getCategories("BOTH");
      console.log("categories", categories);
    } catch (fetchErr: unknown) {
      console.log(`Listing categories failed: ${(fetchErr as Error).message}`);
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
