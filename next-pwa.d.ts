declare module "next-pwa" {
  import type { NextConfig } from "next";
  type WithPWA = (config: NextConfig) => NextConfig;
  function withPWAInit(pwaConfig: Record<string, any>): WithPWA;
  export default withPWAInit;
}