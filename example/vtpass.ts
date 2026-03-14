import { VtpassClient } from "../src";

async function main() {
  console.log("==========================================");
  console.log("   VTPass Client Example                  ");
  console.log("==========================================");

  try {
    const vtpassClient = new VtpassClient({
      vtpass: {
        apiKey: process.env.VTPASS_API_KEY || "dummy_api_key",
        secretKey: process.env.VTPASS_SECRET_KEY || "dummy_secret_key",
        apiBaseUrl:
          process.env.VTPASS_API_BASE_URL || "https://sandbox.vtpass.com/api",
        publicKey: process.env.VTPASS_PUBLIC_KEY || "dummy_public_key",
      },
    });
    console.log("    VTPass client initialized successfully.");
    
    console.log("    Fetching plans from VTPass... (This may fail with dummy credentials)");
    try {
      // For single provider clients, the first argument to getPlans is just the category or options
      const vtpassPlans = await vtpassClient.getPlans({ category: "DATA" });
      console.log(`    Successfully fetched ${vtpassPlans.length} data plans from VTPass.`);
    } catch (fetchErr: any) {
      console.log(
        `    Fetching plans failed (expected with dummy credentials): ${fetchErr.message}`,
      );
    }
  } catch (err: any) {
    console.error("\n[Example Error]", err.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
