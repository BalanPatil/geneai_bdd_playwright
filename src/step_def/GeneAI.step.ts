import { Given, Then } from "@cucumber/cucumber";
import { CucumberWorld } from "./world/CucumberWorld";
import logger from "../Logs/logger";


Given("user is on GeneAI Home Page",  { timeout: 1000 * 60 },
  async function (this: CucumberWorld) {
    await this.basePage.navigate();
  }
);

Then( "verify the newChat link is present on Home Page", { timeout: 1000 * 60 },
  async function (this: CucumberWorld) {
    await this.geneAIHome.verifyNewChatLink();
    logger.info("User is on Gene AI Home Page...");
  }
);

Then("verify the Agents link is present on Home Page",{ timeout: 1000 * 60 },
  async function (this: CucumberWorld) {
    await this.geneAIHome.verifyAgentLink();
    logger.info("Agents link is present and visible");
  }
);

Then("verify the Ask our Docs link is present on Home Page", { timeout: 1000 * 60 },
  async function (this: CucumberWorld) {
    await this.geneAIHome.verifyAskOurDocsLink();
    logger.info("Ask our Docs link is present and visible");
  }
);

Then("verify the My Docs link is present on Home Page",{ timeout: 1000 * 60 },
  async function (this: CucumberWorld) {
    await this.geneAIHome.verifyMyDocsLink();
    logger.info("My Docs link is present and visible");
  }
);
