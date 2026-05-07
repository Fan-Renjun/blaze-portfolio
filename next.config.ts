import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Alibaba Cloud SDKs are CJS-only; let Node.js handle them directly
  serverExternalPackages: ["@alicloud/openapi-client", "@alicloud/tea-util", "@alicloud/tea-core"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
