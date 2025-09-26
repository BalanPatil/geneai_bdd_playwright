import { PageManager } from "./../../page-objects/base/PageManager";
import { chromium, firefox, webkit } from "playwright";
import { AfterAll, Before, After, BeforeAll, AfterStep, Status } from "@cucumber/cucumber";
import { Browser, BrowserType } from "@playwright/test";
import { pageFixture, createBrowserContext } from "./browserContextFixtures";
import logger from "../../Logs/logger";
import { setGlobalTimeouts } from "../../utills/playwrightTimeouts";
import fs from "fs";
import path from "path";

// Load Environment variables
import { config as loadEnv } from "dotenv";
const env = loadEnv({ path: "./env/.env" });

//Create a Configuration object to assign default values to parameters
const config = {
  headless: env.parsed?.HEADLESS === "true",
  browser: env.parsed?.BROWSER || "chromium",
  width: parseInt(env.parsed?.BROWSER_WIDTH || "1900"),
  height: parseInt(env.parsed?.BROWSER_HEIGHT || "1000"),
};

const browsers: {
  [key: string]: BrowserType;
} = {
  chromium: chromium,
  firefox: firefox,
  webkit: webkit,
};

let browserInstance: Browser | null = null;

async function initaliseBrowserContext(selectedBrowser: string): Promise<Browser> {
  const launchBrowser = browsers[selectedBrowser];
  if (!launchBrowser) {
    throw new Error(`invalid Browser Selected:${selectedBrowser}`);
  }
  return await launchBrowser.launch({ headless: config.headless });
}

async function initalisePage(): Promise<void> {
  if (!browserInstance) {
    throw new Error("Browser instance is null");
  }

  // Create directories for test artifacts
  const testResultsDir = path.join(process.cwd(), 'test-results');
  const videosDir = path.join(testResultsDir, 'videos');
  const screenshotsDir = path.join(testResultsDir, 'screenshots');

  // Ensure directories exist
  fs.mkdirSync(testResultsDir, { recursive: true });
  fs.mkdirSync(videosDir, { recursive: true });
  fs.mkdirSync(screenshotsDir, { recursive: true });

  // Initialize browser context with video recording
  pageFixture.context = await browserInstance.newContext({
    ignoreHTTPSErrors: true,
    recordVideo: {
      dir: videosDir,
      size: { width: 1280, height: 720 }
    }
  });

  pageFixture.page = await pageFixture.context.newPage();
  setGlobalTimeouts(pageFixture.page);
  await pageFixture.page.setViewportSize({
    width: config.width,
    height: config.height,
  });
}

//Run once before all scenarios
BeforeAll(async function () {
  logger.info("\n Executing Gene AI Sutie.... ");
});

AfterAll(async function () {
  logger.info("\nCompleted Execution....");
});

// Runs before each scenario

Before(async function () {
  try {
    browserInstance = await initaliseBrowserContext(config.browser);
    logger.info(`Browser Context initialised for: ${config.browser}`);
    await initalisePage();
    this.pageManager = new PageManager();
    this.basePage = this.pageManager.createBasePage();
    this.geneAIHomePage = this.pageManager.createGeneAIHomePage();
    this.agentsPage = this.pageManager.createAgentsPage();
  } catch (error) {
    logger.info("Browser context  initialised failed:", error);
  }
});

// Capture step-level failure screenshot so Allure displays it inline with the failed step
AfterStep(async function ({ result, pickleStep }) {
  if (result?.status === Status.FAILED && pageFixture.page) {
    try {
      const stepNameSafe = pickleStep.text.replace(/[^a-zA-Z0-9]/g, '_').slice(0,80);
      const timestamp = Date.now();
      const screenshotPath = path.join(process.cwd(), 'test-results', 'screenshots', `${stepNameSafe}_${timestamp}.png`);
      const shot = await pageFixture.page.screenshot({ path: screenshotPath, fullPage: true });
      await this.attach(shot, 'image/png');
    } catch (e) {
      logger.warn(`Failed to capture AfterStep screenshot: ${e}`);
    }
  }
});

// Scenario-level teardown (video rename + final cleanup). We no longer capture scenario-level screenshot here to prevent duplication.
After(async function (scenario) {
  try {
    const failed = scenario.result?.status === Status.FAILED;
    const timestamp = Date.now();
    const scenarioName = scenario.pickle.name.replace(/[^a-zA-Z0-9]/g, '_');

    // Handle video (if any) for failed scenarios only, and attach it to Allure
    if (failed && pageFixture.page) {
      // Scenario-level screenshot (distinct from step-level) for quick visibility in Allure
      try {
        const scenarioScreenshotPath = path.join(process.cwd(), 'test-results', 'screenshots', `${scenarioName}_SCENARIO_${timestamp}.png`);
        const scenarioShot = await pageFixture.page.screenshot({ path: scenarioScreenshotPath, fullPage: true });
        await this.attach(scenarioShot, 'image/png');
      } catch (e) {
        logger.warn(`Failed to capture scenario-level screenshot: ${e}`);
      }
      try {
        // Close page context to finalize video file
        await pageFixture.context?.close();
        const videosDir = path.join(process.cwd(), 'test-results', 'videos');
        const recordings = fs.readdirSync(videosDir).filter(f => f.endsWith('.webm'));
        if (recordings.length > 0) {
          const oldPath = path.join(videosDir, recordings[0]);
          const newPath = path.join(videosDir, `${scenarioName}_${timestamp}.webm`);
            fs.renameSync(oldPath, newPath);
            logger.info(`Video saved for failed scenario: ${newPath}`);
            try {
              const videoBuffer = fs.readFileSync(newPath);
              await this.attach(videoBuffer, 'video/webm');
            } catch (e) {
              logger.warn(`Failed to attach video: ${e}`);
            }
        }
      } catch (e) {
        logger.warn(`Video processing error: ${e}`);
      }
    }
  } catch (error) {
    logger.error(`Teardown error: ${error}`);
  } finally {
    try { await pageFixture.page?.close(); } catch { /* ignore */ }
    try { await browserInstance?.close(); } catch { /* ignore */ }
  }
});
