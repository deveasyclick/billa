import { describe, it, expect, vi, beforeEach } from "vitest";
import InterswitchClient from "../src/interswitch";
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

describe("InterswitchClient", () => {
  const config = {
    interswitch: {
      clientId: "test_client_id",
      secretKey: "test_secret_key",
      terminalId: "test_terminal_id",
      apiBaseUrl: "https://sandbox.quickteller.com",
      authUrl: "https://sandbox.quickteller.com/api/v5/Auth/GetAccessToken",
      paymentBaseUrl: "https://sandbox.quickteller.com",
      merchantCode: "test_merchant_code",
      paymentReferencePrefix: "BPY_",
    },
  };

  let client: InterswitchClient;

  beforeEach(() => {
    client = new InterswitchClient(config);
    vi.clearAllMocks();
  });

  it("should be instantiated with config", () => {
    expect(client).toBeInstanceOf(InterswitchClient);
  });

  it("should fetch categories", async () => {
    // 1. Mock token request
    mockedAxios.post.mockResolvedValueOnce({
      data: { access_token: "token", expires_in: 3600 }
    });

    // 2. Mock categories request
    mockedAxios.request.mockResolvedValueOnce({
      data: {
        BillerCategories: [
          { Id: 1, Name: "UTILITIES" }
        ],
      },
    });

    const categories = await client.getCategories();
    expect(categories).toHaveLength(1);
    expect(categories[0].name).toBe("UTILITIES");
  });

  it("should validate customer", async () => {
    // 1. Mock token request
    mockedAxios.post.mockResolvedValueOnce({
      data: { access_token: "token", expires_in: 3600 }
    });

    // 2. Mock validation request
    mockedAxios.request.mockResolvedValueOnce({
        data: {
          Customers: [{ FullName: "John Doe", ResponseCode: "90000" }],
        },
    });

    const response = await client.validateCustomer({
      customerId: "12345",
      paymentCode: "101",
      type: "AIRTIME",
    });

    expect(response.fullName).toBe("John Doe");
    expect(mockedAxios.post).toHaveBeenCalled(); // for token
    expect(mockedAxios.request).toHaveBeenCalled(); // for validation
  });
});
