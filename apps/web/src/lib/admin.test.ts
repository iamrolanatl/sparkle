import { beforeEach, describe, expect, it, vi } from "vitest";

// #67: /admin/sync reads sync_runs via the service role, so requireAdmin() is the only control.
const h = vi.hoisted(() => ({
  user: null as unknown,
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
const notFound = h.notFound;
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ notFound: h.notFound }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: h.user } }) } }),
}));

const { requireAdmin } = await import("./admin");

describe("requireAdmin (#14 / #67)", () => {
  beforeEach(() => {
    notFound.mockClear();
  });
  it("404s when signed out", async () => {
    h.user = null;
    await expect(requireAdmin()).rejects.toThrow("NEXT_NOT_FOUND");
  });
  it("404s for a signed-in non-admin", async () => {
    h.user = { id: "u1", app_metadata: {} };
    await expect(requireAdmin()).rejects.toThrow("NEXT_NOT_FOUND");
  });
  it("ignores a user-editable user_metadata.role spoof", async () => {
    h.user = { id: "u1", app_metadata: {}, user_metadata: { role: "admin" } };
    await expect(requireAdmin()).rejects.toThrow("NEXT_NOT_FOUND");
  });
  it("allows app_metadata.role === admin", async () => {
    h.user = { id: "a1", app_metadata: { role: "admin" } };
    await expect(requireAdmin()).resolves.toMatchObject({ id: "a1" });
    expect(notFound).not.toHaveBeenCalled();
  });
});
