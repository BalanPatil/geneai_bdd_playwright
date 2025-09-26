import { BrowserContext, Page, chromium } from "@playwright/test";
import path from 'path';

export const pageFixture = {
  //@ts-ignore
  page: undefined as Page,
  //@ts-ignore
  context: undefined as BrowserContext,
};

export async function createBrowserContext(): Promise<BrowserContext> {
  const videoDir = path.join(process.cwd(), 'test-results', 'videos');
  
  return await chromium.launchPersistentContext('', {
    recordVideo: {
      dir: videoDir,
      size: { width: 1280, height: 720 }
    }
  });
}
