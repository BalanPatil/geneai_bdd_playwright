import { IWorldOptions, World, setWorldConstructor } from "@cucumber/cucumber";
import { PageManager } from "../../page-objects/base/PageManager";
import { BasePage } from "../../page-objects/base/BasePage";
import { GeneAIHomePage } from "../../page-objects/GeneAIHomePage";
import { AgentsPage } from "../../page-objects/AgentsPage";

export class CucumberWorld extends World {
  public pageManager: PageManager;
  public basePage: BasePage;
  public geneAIHome: GeneAIHomePage;
  public agentsPage: AgentsPage;
  //Base URL
  private url?: string;

  constructor({ attach, log, link, parameters }: IWorldOptions) {
    super({ attach, log, link, parameters });
    this.pageManager = new PageManager();
    this.basePage = this.pageManager.createBasePage();
    this.geneAIHome = this.pageManager.createGeneAIHomePage();
    this.agentsPage = this.pageManager.createAgentsPage();
  }

  setUrl(url: string) {
    this.url = url;
  }
  getUrl() {
    this.url;
  }
}

// info to cucumber world to use custom World
setWorldConstructor(CucumberWorld);
