import { Page, Locator } from "@playwright/test";
import { pageFixture } from "../../step_def/hooks/browserContextFixtures";

// Load Environment variables
import { config as loadEnv } from "dotenv";
const env = loadEnv({ path: "./env/.env" });

const config = {
  width: parseInt(env.parsed?.BROWSER_WIDTH || "1900"),
  height: parseInt(env.parsed?.BROWSER_HEIGHT || "1000"),
  url:env.parsed?.dev_url?.replace(/['"]/g, "") ||
    "https://geneai.thermofisher.com/ask-gene",
  userName:env.parsed?.GENE_AI_USERNAME?.replace(/['"]/g, "") ||
    "geneai-svc-tfs-automation@thermofisher.com",
  passWord:env.parsed?.GENE_AI_PASSWORD?.replace(/['"]/g, "") || "BgNc3*vH%$M&U5b",
};

export class BasePage {
  get page(): Page {
    return pageFixture.page;
  }

  public async login() {
    const userName = await this.page.getByRole("textbox", {
      name: "Enter your email, phone, or",  });
    const password = await this.page.getByRole("textbox", {
      name: "Enter the password for geneai",  });
    userName.fill(config.userName);
    await this.waitandClickByRole("button", "Next");
    password.fill(config.passWord);
    await this.waitandClickByRole("button", "Sign in");
    await this.waitandClickByRole("checkbox", "Don't show this again");
    await this.waitandClickByRole("button", "Yes");
  }

  // function declaration which doesn't return any value

  /**
   * Navigate to a URL. If no URL is provided, uses dev_url from env.
   */
  public async navigate(url?: string): Promise<void> {
    const targetUrl = url || config.url;
    await this.page.goto(targetUrl);
    await this.login();
  }

  /**
   * Get the AUT_URL from environment
   */
  public get autUrl(): string {
    return config.url;
  }

  public async waitandClickByRole(role: string, name: string): Promise<void> {
    const element = await this.page.getByRole(role as any, { name: name });
    await element.click();
  }

  public async type(role: string, value: string): Promise<void> {
    const element = await this.page.getByRole(role as any, { name: value });
    await element.fill(value);
  }

  public async waitandClick(locator: Locator): Promise<void> {
    await locator.isVisible();
    await locator.click();
  }

  public async waitandClickSelector(selector: string): Promise<void> {
    (await this.page.waitForSelector(selector)).click;
    //   await this.page.click(selector);
  }

  // import cucumber world and call as(this.basePage.switchToNewTab)
  public async switchToNewTab(): Promise<void> {
    await this.page.context().waitForEvent("page");
    const allPages = await this.page.context().pages(); // retrive all pages
    pageFixture.page = allPages[allPages.length - 1]; // assign the latest tab to page
    await this.page.bringToFront(); // focus the latest tab/page
    await this.page.setViewportSize({
      width: config.width,
      height: config.height,
    });
  }
}
