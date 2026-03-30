import { describe, it, expect, vi, beforeEach } from "vitest";
import VtpassClient from "../src/vtpass";
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

describe("VtpassClient", () => {
    const config = {
        vtpass: {
            apiKey: "test_api_key",
            secretKey: "test_secret_key",
            apiBaseUrl: "https://sandbox.vtpass.com/api",
            publicKey: "test_public_key",
            phone: "+2348111111111",
        },
    };

    let client: VtpassClient;

    beforeEach(() => {
        client = new VtpassClient(config);
        vi.clearAllMocks();
    });

    it("should fetch categories", async () => {
        mockedAxios.get.mockResolvedValueOnce({
            data: {
                response_description: "000",
                content: [
                    { identifier: "AIRTIME", name: "Airtime Top-up" }
                ],
            },
        });

        const categories = await client.getCategories();
        expect(categories).toHaveLength(1);
        expect(categories[0].name).toBe("AIRTIME");
    });

    it("should validate customer", async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: {
                code: "000",
                content: {
                    Customer_Name: "John Doe",
                },
            },
        });

        const response = await client.validateCustomer({
            customerId: "1234567890",
            paymentCode: "mtn",
            type: "AIRTIME",
        });

        expect(response.fullName).toBe("John Doe");
    });
});
