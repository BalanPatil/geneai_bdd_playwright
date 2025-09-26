import { Page } from "@playwright/test";

import { config as loadEnv } from "dotenv";
const env = loadEnv({ path: "./env/.env" });

export function setGlobalTimeouts(page: Page) {
  const navigationTimeout = parseInt(env.parsed?.NavigationTimeOut || "60000");
  const commandTimeout = parseInt(env.parsed?.CommandTimeout || "60000");

  page.setDefaultNavigationTimeout(navigationTimeout); // navigation time out
  page.setDefaultTimeout(commandTimeout); // Command Time out
}
