import { setDefaultTimeout } from "@cucumber/cucumber";

import { config as loadEnv } from "dotenv";
const env = loadEnv({ path: "./env/.env" });

const customTimeout = parseInt(env.parsed?.CucumberTimeout || "80000");

setDefaultTimeout(customTimeout); // 80 seconds
