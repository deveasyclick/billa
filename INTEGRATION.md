# Integration Guide: Using @deveasyclick/billpay SDK in Your Backend

This guide explains how to integrate the billpay SDK into your existing NestJS backend or any Node.js application.

## Installation

```bash
npm install @deveasyclick/billpay
```

## Setup (NestJS Example)

### 1. Create a BillPay Module

Create `src/modules/billpay/billpay.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { BillPayClient } from '@deveasyclick/billpay';
import { BillPayService } from './billpay.service';
import { BillPayResolver } from './billpay.resolver';

@Module({
  providers: [
    {
      provide: BillPayClient,
      useFactory: () => {
        return new BillPayClient({
          interswitch: {
            clientId: process.env.INTERSWITCH_CLIENT_ID!,
            secretKey: process.env.INTERSWITCH_SECRET_KEY!,
            terminalId: process.env.INTERSWITCH_TERMINAL_ID!,
            apiBaseUrl: process.env.INTERSWITCH_API_BASE_URL!,
            authUrl: process.env.INTERSWITCH_AUTH_URL!,
            paymentBaseUrl: process.env.INTERSWITCH_PAYMENT_BASE_URL!,
            merchantCode: process.env.INTERSWITCH_MERCHANT_CODE!,
            paymentReferencePrefix: process.env.INTERSWITCH_PAYMENT_REFERENCE_PREFIX || 'BPY_',
          },
          vtpass: {
            apiKey: process.env.VTPASS_API_KEY!,
            secretKey: process.env.VTPASS_SECRET_KEY!,
            apiBaseUrl: process.env.VTPASS_API_BASE_URL!,
            publicKey: process.env.VTPASS_PUBLIC_KEY,
          },
        });
      },
    },
    BillPayService,
    BillPayResolver,
  ],
  exports: [BillPayClient, BillPayService],
})
export class BillPayModule {}
```

### 2. Create a BillPay Service

Create `src/modules/billpay/billpay.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { BillPayClient, type BillerItem, type PayRequest } from '@deveasyclick/billpay';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class BillPayService {
  private readonly logger = new Logger(BillPayService.name);

  constructor(
    private readonly billPayClient: BillPayClient,
    private readonly prisma: PrismaService,
  ) {
    // Set provider preferences
    this.billPayClient.setProviderPreference('INTERSWITCH', 'VTPASS');
  }

  /**
   * Get all available billing plans from both providers
   */
  async getPlans(category?: string) {
    try {
      return await this.billPayClient.getPlans(category as any, 'BOTH');
    } catch (error) {
      this.logger.error('Failed to get plans', error);
      throw error;
    }
  }

  /**
   * Process a bill payment
   */
  async processBillPayment(
    billerItem: BillerItem,
    customerId: string,
    amount: number,
    paymentReference: string,
    plan?: string,
  ) {
    try {
      const result = await this.billPayClient.pay({
        billingItemId: billerItem.internalCode,
        paymentReference,
        billerItem,
        customerId,
        amount,
        plan,
      });

      // Save payment attempt to your database
      await this.savePaymentAttempt(paymentReference, result);

      return result;
    } catch (error) {
      this.logger.error(`Payment failed for ${paymentReference}`, error);
      // Save failed attempt
      await this.saveFailedAttempt(paymentReference, error);
      throw error;
    }
  }

  /**
   * Validate customer before payment
   */
  async validateCustomer(
    customerId: string,
    paymentCode: string,
    type?: string,
  ) {
    try {
      return await this.billPayClient.validateCustomer({
        customerId,
        paymentCode,
        type,
      });
    } catch (error) {
      this.logger.error(`Customer validation failed for ${customerId}`, error);
      throw error;
    }
  }

  /**
   * Your database operations for tracking payments
   */
  private async savePaymentAttempt(reference: string, result: any) {
    // Example: Save to database
    // await this.prisma.payment.update({...})
  }

  private async saveFailedAttempt(reference: string, error: any) {
    // Example: Save failed attempt to database
    // await this.prisma.paymentAttempt.create({...})
  }
}
```

### 3. Create GraphQL Resolvers

Create `src/modules/billpay/billpay.resolver.ts`:

```typescript
import { Query, Resolver, Args } from '@nestjs/graphql';
import { BillPayService } from './billpay.service';

@Resolver()
export class BillPayResolver {
  constructor(private readonly billPayService: BillPayService) {}

  @Query()
  async getBillingPlans(@Args('category') category?: string) {
    return this.billPayService.getPlans(category);
  }

  @Query()
  async validateCustomer(
    @Args('customerId') customerId: string,
    @Args('paymentCode') paymentCode: string,
    @Args('type') type?: string,
  ) {
    return this.billPayService.validateCustomer(customerId, paymentCode, type);
  }

  // Add mutation for processing payments
  @Mutation()
  async processBillPayment(
    @Args('input') input: PayBillInput,
  ) {
    // Get billing item
    const billerItem = await this.getBillerItem(input.billerItemId);
    
    return this.billPayService.processBillPayment(
      billerItem,
      input.customerId,
      input.amount,
      input.paymentReference,
      input.plan,
    );
  }

  private async getBillerItem(id: string) {
    // Fetch from your database based on internal code or ID
    // For now, this is handled by your existing BillsService
  }
}
```

### 4. Add Environment Variables

Add to your `.env`:

```env
# InterSwitch
INTERSWITCH_CLIENT_ID=your_client_id
INTERSWITCH_SECRET_KEY=your_secret_key
INTERSWITCH_TERMINAL_ID=your_terminal_id
INTERSWITCH_API_BASE_URL=https://sandbox.quickteller.com
INTERSWITCH_AUTH_URL=https://sandbox.quickteller.com/api/v5/Auth/GetAccessToken
INTERSWITCH_PAYMENT_BASE_URL=https://sandbox.quickteller.com
INTERSWITCH_MERCHANT_CODE=your_merchant_code
INTERSWITCH_PAYMENT_REFERENCE_PREFIX=BPY_

# VTPass
VTPASS_API_KEY=your_api_key
VTPASS_SECRET_KEY=your_secret_key
VTPASS_API_BASE_URL=https://sandbox.vtpass.com/api
VTPASS_PUBLIC_KEY=your_public_key
```

## Migration from Existing Backend

If you have an existing NestJS billpay backend:

### 1. Remove Old Services

Delete or archive:
- `src/integration/interswitch/interswitch.service.ts`
- `src/integration/vtpass/vtpass.service.ts`
- `src/modules/bills/providers/`

### 2. Update BillsService

Replace your `BillsService` with a thin wrapper:

```typescript
import { Injectable } from '@nestjs/common';
import { BillPayClient } from '@deveasyclick/billpay';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class BillsService {
  constructor(
    private readonly billPayClient: BillPayClient,
    private readonly prisma: PrismaService,
  ) {}

  async processBillPayment(request: any) {
    // Fetch billing item from database
    const billerItem = await this.getBillerItem(request.billingItemId);
    
    // Use SDK for payment
    const result = await this.billPayClient.pay({
      billingItemId: request.billingItemId,
      paymentReference: request.paymentReference,
      billerItem,
      customerId: request.customerId,
      amount: request.amount,
      plan: request.plan,
    });

    // Track payment in your database
    await this.savePaymentResult(request.paymentReference, result);

    return result;
  }

  private async getBillerItem(id: string) {
    return this.prisma.billingItem.findUnique({ where: { id } });
  }

  private async savePaymentResult(reference: string, result: any) {
    // Save to your database for tracking
  }
}
```

### 3. Update Package.json

```json
{
  "dependencies": {
    "@deveasyclick/billpay": "^0.1.0",
    // ... other dependencies
  }
}
```

## Features Retained

The SDK provides all the functionality from your original backend:

- ✅ Multiple provider support (InterSwitch and VTPass)
- ✅ Automatic fallback mechanism
- ✅ Retry logic with exponential backoff
- ✅ Token caching for InterSwitch
- ✅ Support for all bill categories
- ✅ Customer validation
- ✅ Plan fetching

## What's Removed

Since the SDK is stateless, your backend now handles:
- Database operations (payment tracking, attempt recording)
- Business logic (rate limiting, user-specific validation)
- State machine management (payment lifecycle)
- Reconciliation and webhook processing

## Error Handling

The SDK throws descriptive errors:

```typescript
try {
  await billPayClient.pay(request);
} catch (error) {
  if (error.message.includes('All providers failed')) {
    // Handle general failure
  } else if (error.message.includes('Invalid provider')) {
    // Handle configuration issue
  } else {
    // Other errors
  }
}
```

## Testing

Mock the SDK in your tests:

```typescript
jest.mock('@deveasyclick/billpay', () => ({
  BillPayClient: jest.fn().mockImplementation(() => ({
    pay: jest.fn().mockResolvedValue({
      paymentRef: 'ref-123',
      status: 'SUCCESS',
      amount: 50000,
      metadata: {},
    }),
    validateCustomer: jest.fn().mockResolvedValue({
      FullName: 'John Doe',
      // ... other fields
    }),
    getPlans: jest.fn().mockResolvedValue([
      // ... mock plans
    ]),
  })),
}));
```

## Support

For issues with the SDK, visit: https://github.com/deveasyclick/billpay-sdk

For issues with your backend integration, refer to your internal documentation.
