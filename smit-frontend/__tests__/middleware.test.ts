import { TextEncoder, TextDecoder } from "util";
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

jest.mock("next/server", () => ({
  NextResponse: {
    redirect: jest.fn((url: URL) => ({
      status: 307,
      headers: { get: (name: string) => url.toString() },
    })),
    next: jest.fn(() => ({
      status: 200,
    })),
  },
  NextRequest: jest.fn(),
}));

jest.mock("jose", () => ({
  jwtVerify: jest.fn(),
}));

describe("middleware", () => {
  it("exports middleware function and config", async () => {
    const mod = await import("@/middleware");
    expect(typeof mod.middleware).toBe("function");
    expect(mod.config).toBeDefined();
  });

  it("config matcher excludes static files", async () => {
    const { config } = await import("@/middleware");
    const matcher = config.matcher[0] as string;
    expect(matcher).toContain("favicon.ico");
  });
});
