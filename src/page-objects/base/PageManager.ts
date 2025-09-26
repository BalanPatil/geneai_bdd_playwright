import { AgentsPage } from "../AgentsPage";
import { Page } from "@playwright/test";
import { BasePage } from "./BasePage";
import { pageFixture } from "../../step_def/hooks/browserContextFixtures";
import { GeneAIHomePage } from "../GeneAIHomePage";

export class PageManager {
  get Page(): Page {
    return pageFixture.page;
  }

  createBasePage(): BasePage {
    return new BasePage();
  }
  createGeneAIHomePage(): GeneAIHomePage {
    return new GeneAIHomePage();
  }
  createAgentsPage(): AgentsPage {
    return new AgentsPage();
  }
}
