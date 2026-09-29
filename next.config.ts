import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: false,
  skipWaiting: true,
  importScripts: ["firebase-messaging-sw.js"],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/caresync-backend-mu\.vercel\.app\/api\/.*/i,
      handler: "NetworkOnly",
    },
    {
      urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|svg)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "static-assets",
        expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  /* your existing config options here */
};

export default withPWA(nextConfig);