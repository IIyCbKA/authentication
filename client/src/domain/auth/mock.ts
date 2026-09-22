import type { CommonFulfilledResponse } from "./types";

const SIGNED_OUT_KEY = "auth:mock:signed-out";

function createSession(): CommonFulfilledResponse {
  return {
    accessToken: `mock-access-${crypto.randomUUID()}`,
    isAuthenticated: true,
    user: {
      id: 1,
      username: "dev_user",
      email: "dev@example.test",
      isEmailVerified: true,
    },
  };
}

export async function login(): Promise<CommonFulfilledResponse> {
  sessionStorage.removeItem(SIGNED_OUT_KEY);
  return createSession();
}

export async function refresh(): Promise<CommonFulfilledResponse> {
  if (sessionStorage.getItem(SIGNED_OUT_KEY) === "true") {
    throw new Error("Mock session is signed out");
  }

  return createSession();
}

export async function logout(): Promise<void> {
  sessionStorage.setItem(SIGNED_OUT_KEY, "true");
}
