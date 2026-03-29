# @deveasyclick/billpay

A framework-agnostic Node.js SDK for bill payment processing with automatic provider failover in Nigeria. Supports InterSwitch and VTPass providers for airtime, data, TV, electricity, and gaming bill payments.

## Features

- 🔄 **Automatic Failover**: Automatically switches to fallback provider on primary failure.
- 🏭 **Multiple Providers**: Built-in support for InterSwitch and VTPass payment providers.
- 🎯 **Single-Provider Clients**: Instantiate `InterswitchClient` or `VtpassClient` when you only need one provider, or supply only one provider to `BillPayClient`.
- 🏷️ **Unified Categories**: Access normalized bill categories across providers using `getCategories()`.
- 🔍 **Provider-Agnostic Abstractions**: Fetch billing plans, validate customers, and process payments uniformly, regardless of the underlying provider.
- ✅ **Transaction Confirmation**: Verify and requery transaction status uniformly using `confirmTransaction()`.
- 📱 **Comprehensive Coverage**: Airtime, Data, TV subscriptions, Electricity, and Gaming.
- 🚀 **Framework-Agnostic**: Works seamlessly with Express, Fastify, NestJS, or any Node.js framework.
- 💻 **Stateless**: No database dependencies. The SDK is entirely stateless.
- 🔧 **Flexible Configuration**: Plug in your custom HTTP client if needed.
- 📦 **TypeScript-First**: Full type safety with extensive TypeScript support for requests and responses.

## Installation

```bash
npm install @deveasyclick/billpay
# or
yarn add @deveasyclick/billpay
# or
pnpm add @deveasyclick/billpay
```

## Quick Start

### 1. Initialization

```typescript
import { BillPayClient, InterswitchClient, VtpassClient } from '@deveasyclick/billpay';

// Full configuration with both providers
const client = new BillPayClient({
  interswitch: {
    clientId: 'your-client-id',
    secretKey: 'your-secret-key',
    terminalId: 'your-terminal-id',
    apiBaseUrl: 'https://sandbox.quickteller.com',
    authUrl: 'https://sandbox.quickteller.com/api/v5/Auth/GetAccessToken',
    paymentReferencePrefix: 'BPY_',
  },
  vtpass: {
    apiKey: 'your-api-key',
    secretKey: 'your-secret-key',
    apiBaseUrl: 'https://sandbox.vtpass.com/api',
    publicKey: 'your-public-key',
    phone: "0801111111"
  },
});

// Set provider preference (primary and fallback)
client.setProviderPreference('INTERSWITCH', 'VTPASS');
```

If you only use one provider, you can initialize a single-provider client cleanly:

```typescript
// InterSwitch only
const interswitchClient = new InterswitchClient({
  interswitch: { /* config */ }
});

// VTPass only
const vtpassClient = new VtpassClient({
  vtpass: { /* config */ }
});
```

### 2. Usage Examples

```typescript
// 1. Get Categories
const categories = await client.getCategories('BOTH');
console.log('Categories:', categories);

// 2. Get available plans (supports provider-specific filters)
const plans = await client.getPlans({ 
  provider: 'BOTH',
  filters: {
    interswitch: { categoryId: ['3'] }, // Example filter
    vtpass: { serviceID: ['mtn'] }
  }
});

// Find a specific plan
const mtnPlan = plans.find(p => p.billerName === 'MTN' && p.amount === 50000);

// 3. Validate customer (e.g., meter number or smartcard)
const customer = await client.validateCustomer({
  customerId: '08012345678',
  paymentCode: mtnPlan.paymentCode,
  provider: 'INTERSWITCH',
});
console.log('Customer Details:', customer);

// 4. Execute payment
const paymentResult = await client.pay({
  billingItemId: mtnPlan.id, // Internal item ID
  paymentReference: 'unique-ref-12345',
  billerItem: mtnPlan,
  customerId: '08012345678',
  amount: 50000,
});
console.log('Payment result:', paymentResult);

// 5. Confirm/Requery Transaction
const confirmation = await client.confirmTransaction('unique-ref-12345');
console.log('Transaction Status:', confirmation);
```

## API Reference

### `BillPayClient`

The primary class for bill payment operations. Accepts `interswitch` and/or `vtpass` configuration. If only one is supplied, it behaves like a single-provider client and disables failover.

#### Constructor

```typescript
new BillPayClient(config: BillPayClientConfig)
```

#### Methods

- `setProviderPreference(primary: ProviderType, fallback?: ProviderType | null)`
  Sets the primary and optional fallback provider for default payment execution.

- `getActiveProviders()`
  Returns the current primary and fallback providers.

- `getCategories(provider?: ProviderType | 'BOTH'): Promise<BillPayCategory[]>`
  Fetches unified biller categories (e.g., Airtime, Data, Power). Removes duplicates when fetching from both providers.

- `getPlans(options?: GetPlansOptions): Promise<BillerItem[]>`
  Fetches available billing plans across providers. You can restrict to a single provider or specify exact filters for Interswitch or VTPass.

- `validateCustomer(request: ValidateCustomerRequest): Promise<Customer>`
  Validates a target customer identifier (like a decoder smartcard or prepaid meter number) prior to payment.

- `pay(request: PayRequest): Promise<PayResponse>`
  Executes a payment. Automatic failover logic triggers if the primary provider fails, substituting the fallback provider (if available and not overridden). Overriding the provider for a specific payment disables failover.

- `confirmTransaction(reference: string, provider?: ProviderType): Promise<PayResponse>`
  Verifies the status of a previously executed transaction.

### `InterswitchClient` & `VtpassClient`

Convenience wrappers around `BillPayClient` tailored for a single backend. Using them provides the same interface (`getPlans()`, `pay()`, `validateCustomer()`, `confirmTransaction()`, `getCategories()`) but ignores any attempt to override the provider parameter.

## Supported Bill Categories

| Category | Providers | Examples |
|----------|-----------|----------|
| AIRTIME | Both | MTN, Airtel, GLO, 9Mobile |
| DATA | Both | MTN Data, Airtel Data, Spectranet, Smile |
| TV | Both | DSTV, GOTV, Startimes, Showmax |
| ELECTRICITY | Both | Ikeja, Eko, Abuja, Kano, Port Harcourt, Jos, Kaduna, Enugu, Ibadan, Benin, Aba, Yola |
| GAMING | InterSwitch | Various sports betting and gaming services |

## Fallback Behavior

When calling `pay()` using `BillPayClient` with both providers initialized, the SDK attempts the designated primary provider first. If an error or failure occurs, it automatically falls back to the configured fallback provider.

```typescript
client.setProviderPreference('INTERSWITCH', 'VTPASS');

// Attempts INTERSWITCH first. If it fails due to timeout/error, tries VTPASS.
const result = await client.pay(paymentRequest);
```

You can explicitly override the provider for a single operation, which bypasses the fallback mechanism:

```typescript
// Enforces VTPass strictly for this call
const result = await client.pay({
  ...paymentRequest,
  provider: 'VTPASS',
});
```

## Error Handling

The SDK ensures robust error bubbling:
- Explanatory failures if all providers fail (returns the final error trace).
- Disallows invalid configurations (e.g., instantiating without providers).
- Rejects provider overrides to unconfigured backends.

```typescript
try {
  const result = await client.pay(paymentRequest);
} catch (error) {
  console.error('Payment failed across available providers:', error.message);
}
```

## Environment Variables Configuration

Recommended environment variables for a secure and standard integration:

```env
# InterSwitch
INTERSWITCH_CLIENT_ID=your_client_id
INTERSWITCH_SECRET_KEY=your_secret_key
INTERSWITCH_TERMINAL_ID=your_terminal_id
INTERSWITCH_MERCHANT_CODE=your_merchant_code

# VTPass
VTPASS_API_KEY=your_api_key
VTPASS_SECRET_KEY=your_secret_key
VTPASS_PUBLIC_KEY=your_public_key
```

## Stateless Architecture

The SDK strictly operates statelessly. It offloads lifecycle handling and database schemas to your backend:
- Instantly scalable across multiple cloud nodes.
- Unburdens the host application from maintaining cached API states unnecessarily.
- Payment intents tracking (pending, failed, successful) remains fully in your control.

## License

MIT

## Support

For issues, questions, or contributions, please visit the [GitHub repository](https://github.com/deveasyclick/billpay-sdk).
