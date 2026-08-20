import nextConfig from "eslint-config-next";
import eslintConfigPrettier from "eslint-config-prettier";

const config = [
  ...nextConfig,
  eslintConfigPrettier,
  {
    ignores: ["supabase/.branches/**", "supabase/.temp/**"],
  },
];

export default config;
