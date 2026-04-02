import { describe, it, expect, vi, beforeEach } from "vitest";
import { BillpayClient } from "../src";
import axios from "axios";

vi.mock("axios", () => {
  const mockAxios = {
    get: vi.fn(),
    post: vi.fn(),
    request: vi.fn(),
    create: vi.fn(),
  };
  mockAxios.create.mockReturnValue(mockAxios);
  return {
    default: mockAxios,
  };
});
const mockedAxios = axios as any;

describe("BillpayClient", () => {
  const config = {
    interswitch: {
      clientId: "is_client_id",
      secretKey: "is_secret_key",
      terminalId: "is_terminal_id",
      apiBaseUrl: "https://sandbox.quickteller.com",
      authUrl: "https://sandbox.quickteller.com/api/v5/Auth/GetAccessToken",
      paymentBaseUrl: "https://sandbox.quickteller.com",
      merchantCode: "is_merchant_code",
      paymentReferencePrefix: "BPY_",
    },
    vtpass: {
      apiKey: "vt_api_key",
      secretKey: "vt_secret_key",
      apiBaseUrl: "https://sandbox.vtpass.com/api",
      publicKey: "vt_public_key",
      phone: "+2348111111111",
    },
  };

  let client: BillpayClient;

  beforeEach(() => {
    vi.resetAllMocks();
    mockedAxios.create.mockReturnValue(mockedAxios);
    client = new BillpayClient(config);
  });

  it("should initialize with both providers", () => {
    const providers = client.getActiveProviders();
    expect(providers.primary).toBe("INTERSWITCH");
    expect(providers.fallback).toBe("VTPASS");
  });

  it("should fallback to VTpass when Interswitch fails on payment", async () => {
    // 1. Interswitch token request
    mockedAxios.post.mockResolvedValueOnce({
      data: { access_token: "token", expires_in: 3600 },
    });

    // 2. Interswitch payment request fail
    mockedAxios.request.mockRejectedValueOnce(new Error("Interswitch failed"));

    // 3. VTpass payment request success
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        content: {
          transactions: {
            status: "delivered",
            channel: "api",
          },
        },
        amount: 100,
        code: "000",
        response_description: "000",
      },
    });

    const result = await client.pay({
      customerId: "12345",
      amount: 100,
      paymentCode: "101",
      reference: "ref_1",
      category: "AIRTIME",
      biller: "MTN",
    });

    expect(result.status).toBe("success");
  });

  it("should fetch combined categories from both providers", async () => {
    // 1. Interswitch token request
    mockedAxios.post.mockResolvedValueOnce({
      data: { access_token: "token", expires_in: 3600 },
    });

    // 2. Interswitch categories request
    mockedAxios.request.mockResolvedValueOnce({
      data: {
        BillerCategories: [{ Id: 1, Name: "UTILITIES" }],
      },
    });

    // 3. VTpass categories request
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        response_description: "000",
        content: [{ identifier: "AIRTIME", name: "AIRTIME" }],
      },
    });

    const categories = await client.getCategories("BOTH");
    expect(categories).toHaveLength(2);
    const names = categories.map((c) => c.name);
    expect(names).toContain("UTILITIES");
    expect(names).toContain("AIRTIME");
  });
});
