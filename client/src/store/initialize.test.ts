import { describe, expect, it, vi } from "vitest";

const setup = vi.hoisted(() => ({
  authInterceptors: vi.fn(() => vi.fn()),
  notificationListeners: vi.fn(() => vi.fn()),
}));

vi.mock("./authInterceptors", () => ({
  setupAuthInterceptors: setup.authInterceptors,
}));

vi.mock("./notifications/listeners", () => ({
  setupNotificationListeners: setup.notificationListeners,
}));

describe("store initialization", () => {
  it("installs integrations once even when the module is imported again", async () => {
    await import("./initialize");
    await import("./initialize");

    expect(setup.authInterceptors).toHaveBeenCalledTimes(1);
    expect(setup.notificationListeners).toHaveBeenCalledTimes(1);
  });
});
