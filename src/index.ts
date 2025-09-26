import { exec, spawn } from "child_process";
import logger from "./Logs/logger";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import os from "os";
dotenv.config({ path: "./env/.env" });

// Load allure config from playwright.config.js if present
let allureCfg: any = {};
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pw = require("../playwright.config.js");
  allureCfg = pw.allure || {};
} catch { /* ignore if missing */ }


interface ProfileTagMap { [key: string]: string }
const profileTags: ProfileTagMap = {
  smoke: "@smoke",
  regression: "@regression",
  login: "@login"
};

const LOG_DEBUG = (process.env.LOG_LEVEL || "info").toLowerCase() === "debug";

const retryValue = process.env.RETRY || "0";
const parallelValue = process.env.PARALLEL || "1";

function trimOuterQuotes(s: string) {
  return s.replace(/^["']|["']$/g, "").trim();
}

function looksLikeTagExpression(token: string): boolean {
  return token.startsWith("@") || /\b(and|or|not)\b/.test(token);
}

function resolveTagExpression(argv: string[]): string {
  let explicit: string | undefined;
  let profile: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--tags" || a === "-t") {
      explicit = argv[i + 1];
      i++;
      continue;
    }
    if (a.startsWith("--tags=")) {
      explicit = a.slice(7);
      continue;
    }
    if (a === "--profile" || a === "-p") {
      profile = argv[i + 1];
      i++;
      continue;
    }
  
    if (!a.startsWith("--")) {
      if (!profile && profileTags[a]) {
        profile = a;
        continue;
      }
      if (!explicit && looksLikeTagExpression(a)) {
        explicit = a;
        continue;
      }
    }
  }

  const envTags = process.env.TAGS;
  let resolved = explicit || (profile ? profileTags[profile] : undefined) || envTags || "not @ignore";
  resolved = trimOuterQuotes(resolved);
  return resolved;
}

// Small cross-version recursive copy helper (uses fs.cpSync when available)
function copyRecursiveSync(src: string, dest: string) {
  // @ts-ignore
  if (fs.cpSync) {
    // @ts-ignore
    fs.cpSync(src, dest, { recursive: true });
    return;
  }
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const e of fs.readdirSync(src)) copyRecursiveSync(path.join(src, e), path.join(dest, e));
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function buildCucumberArgs(tagExpression: string): string[] {
  const args: string[] = [
    "./src/features/*.feature",
    "--require-module", "ts-node/register",
    "--require", "./src/step_def/**/*.ts",
    "--require", "./src/utills/cucumberTimeouts.ts",
    "--parallel", parallelValue,
    "--retry", retryValue,
    "--format", "progress",
    "--format", "json:test-results/cucumber-report.json",
    "--tags", tagExpression
  ];
  if (allureCfg.resultsDir) {
    args.push("--format", "allure-cucumberjs/reporter");
  }
  return args;
}

function writeAllureMeta() {
  if (!allureCfg.environment) return;
  const resultsDir = allureCfg.resultsDir || 'allure-results';
  fs.mkdirSync(resultsDir, { recursive: true });
  fs.writeFileSync(path.join(resultsDir, 'environment.properties'), [
    `OS=${process.platform}`,
    `Node=${process.version}`,
    `Parallel=${parallelValue}`,
    `Retry=${retryValue}`
  ].join('\n'));
  const executor = {
    name: 'GeneAI BDD',
    type: 'local',
    buildName: new Date().toISOString(),
    buildOrder: Date.now(),
    reportName: 'GeneAI Automated Test Report'
  };
  fs.writeFileSync(path.join(resultsDir, 'executor.json'), JSON.stringify(executor, null, 2));
}

function generateAllureReport(failed: boolean) {
  if (!allureCfg.generate) return;
  const resultsDir = allureCfg.resultsDir || 'allure-results';
  const reportDir = allureCfg.reportDir || 'allureReport';
  if (!fs.existsSync(resultsDir)) {
    logger.warn('No allure results found; skipping report generation.');
    if (failed) process.exitCode = 1;
    return;
  }
  // Preserve history (copy from previous report if exists)
  try {
    if (fs.existsSync(reportDir)) {
      const historySrc = path.join(reportDir, 'history');
      if (fs.existsSync(historySrc)) {
        const historyDest = path.join(resultsDir, 'history');
        fs.mkdirSync(historyDest, { recursive: true });
        // @ts-ignore
        if (fs.cpSync) { fs.cpSync(historySrc, historyDest, { recursive: true }); }
        else {
          const copyRecursive = (s: string, d: string) => {
            const st = fs.statSync(s);
            if (st.isDirectory()) {
              fs.mkdirSync(d, { recursive: true });
              for (const e of fs.readdirSync(s)) copyRecursive(path.join(s, e), path.join(d, e));
            } else fs.copyFileSync(s, d);
          };
          copyRecursive(historySrc, historyDest);
        }
      }
    }
  } catch (e:any) { logger.warn('History preservation failed: ' + e.message); }

  // Provide categories mapping (basic) if missing
  try {
    const categoriesPath = path.join(resultsDir, 'categories.json');
    if (!fs.existsSync(categoriesPath)) {
      const categories = [
        { name: 'Assertion Failures', matchedStatuses: ['failed'], messageRegex: '.*expect.*' },
        { name: 'Broken Tests', matchedStatuses: ['broken'] }
      ];
      fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2));
    }
  } catch (e:any) { logger.warn('Failed to write categories.json: ' + e.message); }
  // Optional normalization: treat 'broken' as 'failed' for clearer dashboards
  if (process.env.ALLURE_TREAT_BROKEN_AS_FAILED === '1') {
    try {
      const files = fs.readdirSync(resultsDir).filter(f => f.endsWith('-result.json'));
      for (const f of files) {
        const p = path.join(resultsDir, f);
        const raw = fs.readFileSync(p, 'utf-8');
        const json = JSON.parse(raw);
        if (json.status === 'broken') {
          json.status = 'failed';
          if (json.testStage?.status === 'broken') json.testStage.status = 'failed';
          fs.writeFileSync(p, JSON.stringify(json));
        }
      }
      logger.info('Normalized broken statuses to failed for Allure display.');
    } catch (e:any) {
      logger.warn('Failed status normalization: ' + e.message);
    }
  }
  const cmd = `npx allure generate ${resultsDir} -o ${reportDir} ${allureCfg.clean ? '--clean' : ''}`.trim();
  logger.info('Generating Allure report...');
  exec(cmd, { encoding: 'utf-8' }, (err, stdout, stderr) => {
    if (stdout) console.error(stdout);
    if (stderr) console.error(stderr);
    if (err) {
      logger.error('Allure report generation failed: ' + err.message);
    } else {
      logger.info(`Allure report generated at ./${reportDir}`);
      // Post-process widgets to ensure index.html has runs/suites populated
      try {
        const widgetsDir = path.join(reportDir, 'widgets');
        const dataDir = path.join(reportDir, 'data');
        const summaryPath = path.join(widgetsDir, 'summary.json');
        const launchPath = path.join(widgetsDir, 'launch.json');
        const suitesPath = path.join(widgetsDir, 'suites.json');
  let summary: any = { reportName: 'Report', testRuns: [], statistic: {}, time: {} };
        if (fs.existsSync(summaryPath)) summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));

        const launchUid = `launch-${Date.now()}`;
        const launchEntry = { uid: launchUid, name: summary.reportName || 'Run', time: summary.time || {}, statistic: summary.statistic || {} };
        fs.writeFileSync(launchPath, JSON.stringify([launchEntry], null, 2));

        summary.testRuns = [{ uid: launchUid, name: launchEntry.name, time: launchEntry.time, statistic: launchEntry.statistic }];
        fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

        const packagesPath = path.join(dataDir, 'packages.json');
        if (fs.existsSync(packagesPath)) {
          const pk = JSON.parse(fs.readFileSync(packagesPath, 'utf-8'));
          const items: any[] = [];
          const walkChildren = (node: any) => {
            if (node.children && Array.isArray(node.children)) {
              for (const ch of node.children) {
                if (ch.children) walkChildren(ch);
                else items.push({ name: ch.name, uid: ch.uid || ch.name, status: ch.status || 'unknown', time: ch.time || {} });
              }
            }
          };
          walkChildren(pk);
          const suites = { total: items.length, items };
          fs.writeFileSync(suitesPath, JSON.stringify(suites, null, 2));
        }
      } catch (e:any) { logger.warn('Post-process report widgets failed: ' + e.message); }
      // Write a lightweight static summary for quick inspection
      try {
        const tcDir = path.join(reportDir, 'data', 'test-cases');
        const attachmentsDir = path.join(reportDir, 'data', 'attachments');
        const files = fs.existsSync(tcDir) ? fs.readdirSync(tcDir).filter(f => f.endsWith('.json')) : [];
        let rows = '';
        for (const f of files) {
          try {
            const json = JSON.parse(fs.readFileSync(path.join(tcDir, f), 'utf-8'));
            const name = json.name || f;
            const status = json.status || 'unknown';
            const dur = json.time?.duration || 0;
            let attachLinks = '';
            // collect attachments listed in steps/afterStages
            const collect = (node: any) => {
              if (!node) return [];
              const at: any[] = [];
              if (Array.isArray(node.attachments)) at.push(...node.attachments.map((a: any) => a.source));
              if (Array.isArray(node.steps)) for (const s of node.steps) at.push(...collect(s));
              return at;
            };
            const atSources = new Set<string>();
            atSourcesFrom: {
              const bs = collect(json.beforeStages?.[0]) || [];
            }
            for (const st of ['beforeStages','testStage','afterStages']) {
              const node = json[st];
              if (!node) continue;
              if (Array.isArray(node)) {
                for (const n of node) for (const s of collect(n)) atSources.add(s);
              } else {
                for (const s of collect(node)) atSources.add(s);
              }
            }
            for (const src of Array.from(atSources)) {
              const p = path.join('data', 'attachments', src);
              if (fs.existsSync(path.join(reportDir, p))) attachLinks += `<a href="${p}">${src}</a> `;
            }
            rows += `<tr><td>${name}</td><td>${status}</td><td>${dur}ms</td><td>${attachLinks}</td></tr>`;
          } catch (_) { /* ignore malformed */ }
        }
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>GeneAI Regression Quick Summary</title></head><body><h1>GeneAI Regression Quick Summary</h1><table border="1" cellpadding="6"><tr><th>Test</th><th>Status</th><th>Duration</th><th>Attachments</th></tr>${rows}</table></body></html>`;
        fs.writeFileSync(path.join(reportDir, 'latest-summary.html'), html);
      } catch (e:any) { logger.warn('Failed to write latest-summary.html: ' + e.message); }
      // Optional archiving: set ALLURE_ARCHIVE=1 to keep a timestamped copy
      if (process.env.ALLURE_ARCHIVE === '1') {
        try {
          const ts = new Date().toISOString().replace(/[:.]/g, '-');
          const archiveRoot = path.join(process.cwd(), 'allure-archive');
          const dest = path.join(archiveRoot, ts);
          fs.mkdirSync(archiveRoot, { recursive: true });
          // Simple directory copy (node >=16 has cpSync)
          // @ts-ignore
          if (fs.cpSync) {
            // @ts-ignore
            fs.cpSync(reportDir, dest, { recursive: true });
          } else {
            // Fallback manual copy
            const copyRecursive = (src: string, tgt: string) => {
              const stats = fs.statSync(src);
              if (stats.isDirectory()) {
                fs.mkdirSync(tgt, { recursive: true });
                for (const entry of fs.readdirSync(src)) {
                  copyRecursive(path.join(src, entry), path.join(tgt, entry));
                }
              } else {
                fs.copyFileSync(src, tgt);
              }
            };
            copyRecursive(reportDir, dest);
          }
          logger.info(`Archived Allure report snapshot: ${dest}`);
          // Prune old archives if exceeding limit
          const limit = parseInt(process.env.ALLURE_ARCHIVE_LIMIT || '10', 10);
            if (limit > 0) {
              const dirs = fs.readdirSync(archiveRoot)
                .map(d => ({ d, p: path.join(archiveRoot, d), t: fs.statSync(path.join(archiveRoot, d)).mtimeMs }))
                .filter(o => fs.statSync(o.p).isDirectory())
                .sort((a,b) => b.t - a.t);
              if (dirs.length > limit) {
                for (const rem of dirs.slice(limit)) {
                  try { fs.rmSync(rem.p, { recursive: true, force: true }); } catch { /* ignore */ }
                }
              }
            }
        } catch (e:any) {
          logger.warn('Failed to archive Allure report: ' + e.message);
        }
      }
    }
    if (failed) process.exitCode = 1;
  });
}

function run() {
  const argv = process.argv.slice(2);
  if (LOG_DEBUG) logger.info(`Raw CLI args: ${JSON.stringify(argv)}`);

  const tagExpression = resolveTagExpression(argv);
  logger.info(`Executing Cucumber with tag expression: ${tagExpression}`);

  const cucumberArgs = buildCucumberArgs(tagExpression);
  if (LOG_DEBUG) logger.info(`Cucumber args: ${JSON.stringify(cucumberArgs)}`);

  if (allureCfg.clean && allureCfg.resultsDir) {
    // If a previous generated report contains history, copy it to a temp location
    let backedHistory: string | undefined;
    try {
      if (allureCfg.reportDir && fs.existsSync(allureCfg.reportDir)) {
        const hist = path.join(allureCfg.reportDir, 'history');
        if (fs.existsSync(hist)) {
          backedHistory = fs.mkdtempSync(path.join(os.tmpdir(), 'allure-history-'));
          copyRecursiveSync(hist, path.join(backedHistory, 'history'));
          logger.info('Backed up previous Allure history to ' + backedHistory);
        }
      }
    } catch (e:any) { logger.warn('Failed to backup existing Allure history: ' + e.message); }

    try { fs.rmSync(allureCfg.resultsDir, { recursive: true, force: true }); } catch { /* ignore */ }
    if (allureCfg.reportDir) { try { fs.rmSync(allureCfg.reportDir, { recursive: true, force: true }); } catch { /* ignore */ } }

    // If we backed up history, restore it into the resultsDir so allure generate picks it up
    try {
      if (backedHistory) {
        const resultsDir = allureCfg.resultsDir || 'allure-results';
        const dest = path.join(resultsDir, 'history');
        copyRecursiveSync(path.join(backedHistory, 'history'), dest);
        logger.info('Restored Allure history into ' + dest);
      }
    } catch (e:any) { logger.warn('Failed to restore Allure history: ' + e.message); }
  }

  // Prefer spawning the cucumber binary directly to avoid shell quoting issues with --tags
  let cucumberBin = path.join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'cucumber-js.cmd' : 'cucumber-js');
  // If the direct binary doesn't exist (or spawning fails), we'll fallback to npx
  const useShell = process.platform === 'win32';
  const child = spawn(
    fs.existsSync(cucumberBin) ? cucumberBin : 'npx',
    fs.existsSync(cucumberBin) ? cucumberArgs : ['cucumber-js', ...cucumberArgs],
    { stdio: 'pipe', env: process.env, shell: useShell }
  );

  let stdoutBuf = '';
  let stderrBuf = '';
  child.stdout.on('data', d => { const t = d.toString(); stdoutBuf += t; process.stderr.write(t); }); // keep progress format appearance
  child.stderr.on('data', d => { const t = d.toString(); stderrBuf += t; process.stderr.write(t); });

  child.on('error', (e) => {
    logger.error('Failed to launch cucumber-js: ' + e.message);
  });

  child.on('close', (code) => {
    const failed = code !== 0;
    if (failed) {
      logger.error("Some Test(s) failed. Review report.");
    } else {
      logger.info("Cucumber execution completed successfully.");
    }
    if (allureCfg.resultsDir) writeAllureMeta();
    generateAllureReport(failed);
    if (!allureCfg.generate && failed) process.exitCode = 1;
  });
}

run();
