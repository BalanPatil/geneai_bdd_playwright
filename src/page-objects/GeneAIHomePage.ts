import { BasePage } from "./base/BasePage";
import logger from "../Logs/logger";
import { Locator } from "@playwright/test";

export class GeneAIHomePage extends BasePage {
    private locators!: {
        newChatLink: Locator;
        agentsLink: Locator;
        askDocsLink: Locator;
        myDocsLink: Locator;
    };

    constructor() {
        super();
    }

    private initializeLocators(): void {
        this.locators = {
            newChatLink: this.page.getByText("New chat"),
            agentsLink: this.page.getByText("Agents"),
            askDocsLink: this.page.getByText("Ask our Docs"),
            myDocsLink: this.page.getByText("My Docs")
        };
    }

    public async clickOnNewChat(): Promise<void> {
        await this.locators.newChatLink.click();
        await this.page.waitForLoadState("networkidle");
        logger.info("Clicked on New Chat");
    }

    public async clickOnAgents(): Promise<void> {
        await this.locators.agentsLink.click();
        await this.page.waitForLoadState("networkidle");
        logger.info("Clicked on Agents Link");
    }

    public async verifyNewChatLink(): Promise<void> {
        await this.locators.newChatLink.waitFor({ state: "visible" });
        await this.page.waitForLoadState("networkidle");
        logger.info("New Chat Link is visible");
    }

    public async verifyAgentLink(): Promise<void> {
        await this.locators.agentsLink.waitFor({ state: "visible" });
        await this.page.waitForLoadState("networkidle");
        logger.info("Agents Link is visible");
    }

    public async verifyAskOurDocsLink(): Promise<void> {
        await this.locators.askDocsLink.waitFor({ state: "visible", timeout: 10000 });
        await this.page.waitForLoadState("networkidle");
        logger.info("Ask Our Docs Link is visible on Gene AI Home Page");
    }

    public async verifyMyDocsLink(): Promise<void> {
        await this.locators.myDocsLink.waitFor({ state: "visible", timeout: 10000 });
        await this.page.waitForLoadState("networkidle");
        logger.info("Verified My Docs link on Home Page");
    }
}
