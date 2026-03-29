import * as dotenv from "dotenv";
import { VtpassClient } from "../../src";

dotenv.config();

async function main(): Promise<void> {
  const client = new VtpassClient({
    vtpass: {
      apiKey: process.env.VTPASS_APIKEY || "dummy_api_key",
      secretKey: process.env.VTPASS_SECRET_KEY || "dummy_secret_key",
      apiBaseUrl: process.env.VTPASS_API_BASE_URL || "https://sandbox.vtpass.com/api",
      publicKey: process.env.VTPASS_PUBLIC_KEY || "dummy_public_key",
    },
  });

  try {
    console.log("Fetching VTpass categories...");
    const categories = await client.getCategories();
    console.table(categories);
  } catch (err: unknown) {
    console.error("Error:", (err as Error).message);
  }
}

main().catch(console.error);
