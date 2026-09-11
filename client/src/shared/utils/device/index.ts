import { DEVICE_ID_KEY } from "./constants";
import { DeviceInfo } from "./types";

export const getOrCreateDeviceID: () => string = (): string => {
  let id: string | null = localStorage.getItem(DEVICE_ID_KEY);
  if (id === null) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }

  return id;
};

export const formatScreen: () => string | null = (): string | null => {
  const w = Number(screen.width || 0);
  const h = Number(screen.height || 0);

  if (!w || !h) return null;
  return `${Math.trunc(w)}x${Math.trunc(h)}`;
};

export const collectDeviceInfo: () => DeviceInfo = (): DeviceInfo => {
  return {
    deviceID: getOrCreateDeviceID(),
    userAgent: navigator.userAgent ?? null,
    language: navigator.language ?? null,
    screen: formatScreen(),
    logicalProcessors: navigator.hardwareConcurrency ?? null,
    approxMemory: (navigator as any).deviceMemory ?? null,
    cookiesEnabled: navigator.cookieEnabled ?? null,
    platform: (navigator as any).platform ?? null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
  };
};
