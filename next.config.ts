import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const isProd = process.env.NODE_ENV === "production";

// Pages named page.dev.tsx exist only outside production: the style page is not built there.
const pageExtensions = isProd
  ? ["tsx", "ts", "jsx", "js"]
  : ["dev.tsx", "dev.ts", "tsx", "ts", "jsx", "js"];

// Static security headers. The Content-Security-Policy needs a nonce per request,
// so it is set in src/proxy.ts (see src/lib/security/csp.ts).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  output: "standalone", // smallest runtime for the Docker image
  pageExtensions,
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default createNextIntlPlugin("./src/i18n/request.ts")(nextConfig);
