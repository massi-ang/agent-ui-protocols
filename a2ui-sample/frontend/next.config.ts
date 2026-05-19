import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "export",
  transpilePackages: ["@a2ui/react", "@a2ui/web_core"],
};
export default nextConfig;
