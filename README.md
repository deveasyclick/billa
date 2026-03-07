# @deveasyclick/billpay

A framework-agnostic Node.js SDK for bill payment processing with automatic provider failover. Supports InterSwitch and VTPass providers for airtime, data, TV, electricity, and gaming bill payments.

## Features

- 🔄 **Automatic Failover**: Automatically switches to fallback provider on primary failure
- 🏭 **Multiple Providers**: Support for InterSwitch and VTPass payment providers
- 🎯 **Single‑provider clients**: You can now instantiate `InterswitchClient` or `VtpassClient`, or supply only one provider to `BillPayClient`
- 📱 **Comprehensive Coverage**: Airtime, Data, TV subscriptions, Electricity, and Gaming
- 🚀 **Framework-Agnostic**: Works with Express, Fastify, NestJS, or any Node.js framework
- 💾 **Stateless**: No database dependencies, SDK is entirely stateless
- 🔧 **Flexible Configuration**: Inject custom HTTP client and caching implementation
- 📦 **TypeScript-First**: Full type safety with TypeScript support

## Installation

```bash
npm install @deveasyclick/billpay
# or
yarn add @deveasyclick/billpay
# or
pnpm add @deveasyclick/billpay
```

## Quick Start

```typescript
import { BillPayClient, InterswitchClient, VtpassClient } from '@deveasyclick/billpay';

// full configuration with both providers
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
  },
});

// or init with only one provider (InterSwitch example)
const interswitchOnly = new InterswitchClient({
  interswitch: {
    clientId: 'your-client-id',
    secretKey: 'your-secret-key',
    terminalId: 'your-terminal-id',
    apiBaseUrl: 'https://sandbox.quickteller.com',
    authUrl: 'https://sandbox.quickteller.com/api/v5/Auth/GetAccessToken',
    paymentReferencePrefix: 'BPY_',
  },
});

// vtpass-only client is similar:
// const vtpassOnly = new VtpassClient({ vtpass: { ... } });


// Set provider preference (primary and fallback)
client.setProviderPreference('INTERSWITCH', 'VTPASS');

// Get available plans
const plans = await client.getPlans('AIRTIME', 'BOTH');
console.log(plans);

// Find a specific plan
const mtnPlan = plans.find(p => p.billerName === 'MTN' && p.amount === 50000);

// Execute payment
const paymentResult = await client.pay({
  billingItemId: mtnPlan.id,
  paymentReference: 'unique-ref-12345',
  billerItem: mtnPlan,
  customerId: '08012345678',
  amount: 50000,
});

console.log('Payment result:', paymentResult);

// Validate customer
const customer = await client.validateCustomer({
  customerId: '08012345678',
  paymentCode: mtnPlan.paymentCode,
  provider: 'INTERSWITCH',
});

console.log('Customer:', customer);
```

## API Reference

### BillPayClient

Main client class for bill payment operations.  Accepts both `interswitch` and/or
`vtpass` configuration; at least one must be supplied.  When only a single
provider is configured the client behaves like the corresponding
`InterswitchClient`/`VtpassClient` and provider overrides are disallowed.

### InterswitchClient

Convenience wrapper that is pre‑configured to use InterSwitch only.  This class
exposes the same `getPlans`, `pay` and `validateCustomer` methods as
`BillPayClient` but does not accept a provider override.  Instantiate with:

```ts
import { InterswitchClient } from '@deveasyclick/billpay';

const client = new InterswitchClient({
  interswitch: { /* config */ },
});
```

### VtpassClient

Same as `InterswitchClient` but for the VTPass provider.  Use when your
application only interacts with VTPass:

```ts
import { VtpassClient } from '@deveasyclick/billpay';

const client = new VtpassClient({
  vtpass: { /* config */ },
});
```

#### Constructor

```typescript
new BillPayClient(config: BillPayClientConfig)
```

**Config Parameters:**
- `interswitch`: InterSwitch credentials and endpoints
- `vtpass`: VTPass credentials and endpoints

#### Methods

##### `setProviderPreference(primary: ProviderType, fallback?: ProviderType | null)`

Set the primary and optional fallback provider for payment execution.

```typescript
client.setProviderPreference('VTPASS', 'INTERSWITCH');
```

##### `getActiveProviders()`

Get current provider preferences.

```typescript
const { primary, fallback } = client.getActiveProviders();
```

##### `getPlans(category?: BillCategory, provider?: ProviderType | 'BOTH'): Promise<BillerItem[]>`

Fetch available billing plans.  When using `BillPayClient` with only one provider, the
`provider` argument is ignored since there is only a single source.  Both
`InterswitchClient` and `VtpassClient` expose the same method but without the
`provider` argument.

**Parameters:**
- `category`: Optional category filter ('AIRTIME', 'DATA', 'TV', 'ELECTRICITY', 'GAMING')
- `provider`: 'INTERSWITCH', 'VTPASS', or 'BOTH' (default: primary provider)

```typescript
// Get all airtime plans from both providers
const plans = await client.getPlans('AIRTIME', 'BOTH');

// Get all TV plans from primary provider
const tvPlans = await client.getPlans('TV');

// Get all available plans from VTPass
const vtpassPlans = await client.getPlans(undefined, 'VTPASS');
```

##### `pay(request: PayRequest): Promise<PayResponse>`

Execute a bill payment with automatic failover.  When you create a single‑provider
client, failover logic is obviously disabled and the underlying provider is used
directly.  You can still override the provider for a specific transaction when
using `BillPayClient` by specifying the `provider` field; doing so on a
single‑provider client will throw an error.

**Request Parameters:**
- `billingItemId`: ID of the billing item
- `paymentReference`: Unique payment reference
- `billerItem`: The BillerItem object from `getPlans()`
- `customerId`: Customer identifier (phone number, meter number, etc.)
- `amount`: Amount in kobo (smallest currency unit)
- `plan`: Optional plan detail (for electricity: 'prepaid' or 'postpaid')
- `provider`: Optional provider override (if not set, uses primary provider)

**Response:**
```typescript
{
  paymentRef: string;        // Payment reference
  amount: number;            // Amount paid in kobo
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  metadata: Record<string, any>;
}
```

##### `validateCustomer(request: ValidateCustomerRequest): Promise<Customer>`

Validate a customer before payment.  The `provider` option behaves exactly as it
does for `pay()` (ignored when only one provider is configured, validated
otherwise).

**Parameters:**
- `customerId`: Customer identifier
- `paymentCode`: Payment code/service ID
- `type`: Optional (for electricity: 'prepaid' or 'postpaid')
- `provider`: Optional provider (default: primary)

## Supported Bill Categories

| Category | Providers | Examples |
|----------|-----------|----------|
| AIRTIME | Both | MTN, Airtel, GLO, 9Mobile |
| DATA | Both | MTN Data, Airtel Data, Spectranet, Smile |
| TV | Both | DSTV, GOTV, Startimes, Showmax |
| ELECTRICITY | Both | Ikeja, Eko, Abuja, Kano, Port Harcourt, Jos, Kaduna, Enugu, Ibadan, Benin, Aba, Yola |
| GAMING | InterSwitch | (Various gaming services) |

## Fallback Behavior

When you call `pay()` using `BillPayClient` with two providers, the SDK
automatically tries the primary provider first. If it fails, it attempts the
fallback provider (if configured):

```typescript
client.setProviderPreference('INTERSWITCH', 'VTPASS');

// This will try INTERSWITCH first, then VTPASS if it fails
const result = await client.pay(paymentRequest);
```

You can also override the provider for a single payment:

```typescript
// This specific payment uses VTPASS, ignoring the preference
const result = await client.pay({
  ...paymentRequest,
  provider: 'VTPASS',
});
```

## Error Handling

The SDK throws errors when:
- All providers fail (with the last error message)
- Configuration is invalid (e.g. you construct `BillPayClient` without any provider)
- You attempt to use a provider that wasn’t configured (e.g. `client.pay({..., provider: 'VTPASS' })` on an InterSwitch-only client)
- Invalid provider name is used
- Network/API errors occur

```typescript
try {
  const result = await client.pay(paymentRequest);
} catch (error) {
  console.error('Payment failed:', error.message);
  // Handle error appropriately
}
```

## Configuration Examples

### Using with Custom HTTP Client

```typescript
import axios from 'axios';

const customHttpClient = axios.create({
  timeout: 10000,
  headers: {
    'User-Agent': 'MyApp/1.0',
  },
});

// Note: The SDK will use axios by default if not provided
```

### Production Configuration

```typescript
const client = new BillPayClient({
  interswitch: {
    clientId: process.env.INTERSWITCH_CLIENT_ID!,
    secretKey: process.env.INTERSWITCH_SECRET_KEY!,
    terminalId: process.env.INTERSWITCH_TERMINAL_ID!,
    apiBaseUrl: 'https://api.quickteller.com', // Production URL
    authUrl: 'https://api.quickteller.com/api/v5/Auth/GetAccessToken',
    paymentBaseUrl: 'https://api.quickteller.com',
    merchantCode: process.env.INTERSWITCH_MERCHANT_CODE!,
    paymentReferencePrefix: 'PROD_',
  },
  vtpass: {
    apiKey: process.env.VTPASS_API_KEY!,
    secretKey: process.env.VTPASS_SECRET_KEY!,
    apiBaseUrl: 'https://api.vtpass.com/api', // Production URL
    publicKey: process.env.VTPASS_PUBLIC_KEY!,
  },
});
```

## Environment Variables

Recommended environment variables for your application:

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

The SDK is entirely stateless - it doesn't maintain any database connections or persistent state. This means:

- No database dependencies
- Easy to integrate into any framework
- Scalable across multiple server instances
- Payment state tracking is the responsibility of your application

## TypeScript Support

Full TypeScript support with type definitions included:

```typescript
import type { BillerItem, PayRequest, PayResponse } from '@deveasyclick/billpay';
```

## License

MIT

## Support

For issues, questions, or contributions, please visit the [GitHub repository](https://github.com/deveasyclick/billpay-sdk).
