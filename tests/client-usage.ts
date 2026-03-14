// This script demonstrates the new single-provider clients and the
// behaviour of BillPayClient when one or both providers are configured.
//
// To execute, install ts-node in the workspace:
//   npm install -D ts-node
// then run:
//   npx ts-node tests/client-usage.ts

import {
  BillPayClient,
  InterswitchClient,
  VtpassClient,
  type PayRequest,
} from "../src";

async function main() {
  // Replace these with real credentials if you want to execute
  const interConfig = {
    clientId: "x",
    secretKey: "x",
    terminalId: "x",
    apiBaseUrl: "https://sandbox.quickteller.com",
    authUrl: "https://sandbox.quickteller.com/api/v5/Auth/GetAccessToken",
    paymentBaseUrl: "https://sandbox.quickteller.com",
    merchantCode: "x",
    paymentReferencePrefix: "BPY_",
  };

  const vtConfig = {
    apiKey: "x",
    secretKey: "x",
    apiBaseUrl: "https://sandbox.vtpass.com/api",
    publicKey: "x",
  };

  // both providers
  const both = new BillPayClient({
    interswitch: interConfig,
    vtpass: vtConfig,
  });
  console.log("both providers primary", both.getActiveProviders());

  // InterSwitch only
  const onlyInter = new BillPayClient({ interswitch: interConfig });
  console.log("inter only primary", onlyInter.getActiveProviders());

  // or the dedicated wrapper
  const interClient = new InterswitchClient({ interswitch: interConfig });
  console.log("wrapper works", await interClient.getPlans());

  // fetch plans filtered by category through the wrapper convenience
  console.log("airtime plans", await interClient.getPlans("AIRTIME"));

  // using filter object directly (same shape as SUPPORTED_BILL_ITEMS)
  const filtered = await both.getPlans({
    filters: { "Airtime and Data": ["MTN"] },
    forceRefresh: true,
  });
  console.log("filtered via object", filtered);

  // vtpass only
  const onlyVt = new BillPayClient({ vtpass: vtConfig });
  console.log("vtpass only primary", onlyVt.getActiveProviders());

  const vtClient = new VtpassClient({ vtpass: vtConfig });
  console.log("wrapper works", await vtClient.getPlans());

  // error scenario (uncomment to try)
  // try {
  //   await onlyInter.pay({
  //     billingItemId: 'x',
  //     paymentReference: 'r1',
  //     billerItem: { id: 'x', name: 'x', category: 'AIRTIME', provider: 'INTERSWITCH', amount: 100 },
  //     customerId: '080',
  //     amount: 100,
  //     provider: 'VTPASS', // not configured
  //   } as PayRequest);
  // } catch (err) {
  //   console.error('expected error', err.message);
  // }
}

main().catch((e) => console.error(e));
