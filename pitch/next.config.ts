import path from "node:path";
import type { NextConfig } from "next";

const repositoryRoot = path.join(__dirname, "..");

const nextConfig: NextConfig = {
  devIndicators: false,
  agentRules: false,
  turbopack: { root: repositoryRoot },
  outputFileTracingRoot: repositoryRoot,
};

export default nextConfig;
