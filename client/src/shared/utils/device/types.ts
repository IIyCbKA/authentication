/*
--------------DeviceInfo type--------------
*/
export type DeviceInfo = {
  deviceID: string;
  userAgent: string | null;
  language: string | null;
  screen: string | null;
  logicalProcessors: number | null;
  approxMemory: number | null;
  cookiesEnabled: boolean | null;
  platform: string | null;
  timezone: string | null;
};
