import { BasePage } from "./base/BasePage";
import logger from "../Logs/logger";
import { expect, Locator } from "@playwright/test";

export class AgentsPage extends BasePage {
    private locators!: {
        searchInput: Locator;
        agentCard: Locator;
        startChatButton: Locator;
        refreshButton: Locator;
        agentDescription: Locator;
    };

  /*  constructor() {
        super();
    }
*/
    private initializeLocators(): void {
        if (!this.locators) {
            this.locators = {
                searchInput: this.page.getByPlaceholder("Enter Agent name"),
                agentCard: this.page.locator(".//div[@class='agent-card']"),
                startChatButton: this.page.getByRole("button", { name: "Start Chat" }),
                refreshButton: this.page.getByRole("button", { name: "Refresh" }),
                agentDescription: this.page.locator("div.agent-description")
            };
        }
    }

    private getAgentByName(name: string): Locator {
        this.initializeLocators();
        return this.page.getByRole("heading", { name, exact: true });
    }

    public async searchAnAgent(agentName: string): Promise<void> {
        logger.info("Enter Agent Name to Search....");
        this.initializeLocators();
        await this.locators.searchInput.fill(agentName);
        await this.page.waitForLoadState('networkidle');
        // Look for a specific agent card that contains the agent name
        const agentCard = this.page.locator('div.agent-card', { hasText: agentName });
        await expect(agentCard).toBeVisible({ timeout: 10000 });
    }

    public async selectAgent(agentName: string): Promise<void> {
        logger.info(`Selecting agent: ${agentName}`);
        const agent = this.getAgentByName(agentName);
        await agent.click();
        await this.page.waitForLoadState("networkidle");
    }

    public async verifyAgentDetails(agentName: string): Promise<void> {
        logger.info(`Verifying agent details for: ${agentName}`);
        this.initializeLocators();
        await expect(this.getAgentByName(agentName)).toBeVisible();
        await expect(this.locators.agentDescription).toBeVisible();
        await expect(this.locators.startChatButton).toBeVisible();
    }

    public async startChat(): Promise<void> {
        logger.info("Starting chat with agent");
        this.initializeLocators();
        await this.locators.startChatButton.click();
        await this.page.waitForLoadState("networkidle");
    }
}
