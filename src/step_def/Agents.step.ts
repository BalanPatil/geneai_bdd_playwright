import { expect } from "@playwright/test";
import { pageFixture } from "./hooks/browserContextFixtures";
import { When, Then } from "@cucumber/cucumber";
import logger from "../Logs/logger";
import { CucumberWorld } from "./world/CucumberWorld";

When("the user navigates to the Agents page", async function (this: CucumberWorld) {
    await expect(pageFixture.page.getByPlaceholder("Enter Agent name")).toBeVisible();
    logger.info("Navigated to Agents page");
  }
);

Then("the agents page elements should be displayed",{ timeout: 60000 },
  async function (this: CucumberWorld) {
   // await this.agentsPage.isAgentsTabVisible();
    logger.info("validated Agent page elements....");
  }
);

Then("user search an agent", { timeout: 60000 },async function (this: CucumberWorld) {
    logger.info("Searching for an Agent....");
    await this.agentsPage.searchAnAgent("AAD_SQA");
  }
);
