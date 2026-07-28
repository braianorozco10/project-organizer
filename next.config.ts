import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `pg` is only required when DATABASE_URL points at a non-Neon host (local or
  // self-hosted Postgres). Keeping it external avoids bundling its native paths.
  serverExternalPackages: ["pg", "exceljs"],
};

export default nextConfig;
