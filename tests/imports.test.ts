import { describe, it, expect } from "vitest";
import InterswitchClient from "../src/interswitch";
import VtpassClient from "../src/vtpass";

describe("Subpath Imports", () => {
  it("should import InterswitchClient as default", () => {
    expect(InterswitchClient).toBeDefined();
    expect(typeof InterswitchClient).toBe("function");
    // It's a class
    expect(InterswitchClient.prototype.constructor.name).toBe("InterswitchClient");
  });

  it("should import VtpassClient as default", () => {
    expect(VtpassClient).toBeDefined();
    expect(typeof VtpassClient).toBe("function");
    // It's a class
    expect(VtpassClient.prototype.constructor.name).toBe("VtpassClient");
  });
});
