# GeneAI BDD Playwright Test Suite

## Running Scenarios By Tags

Tags are resolved with the following precedence (highest first):

1. Explicit CLI flag `--tags "<expression>"` or `-t "<expression>"`
2. A profile keyword argument (`smoke`, `regression`, `login`) passed positionally or via `--profile <name>` mapping to pre-defined tag expressions:
	- `smoke` => `@smoke`
	- `regression` => `@regression`
	- `login` => `@login`
3. Environment variable `TAGS` (e.g. `TAGS=@regression and not @wip`)
4. Default fallback: `not @ignore`

### Examples

Run any expression directly:

```powershell
npm run bdd -- --tags "@regression and not @wip"
```

Using a profile shortcut (maps automatically to a tag):

```powershell
npm run bdd -- smoke
```

Or with the provided convenience scripts:

```powershell
npm run test:smoke
npm run test:regression
```

Using environment variable (Windows PowerShell):

```powershell
$env:TAGS='@regression and not @ignore'; npm run bdd
```

### Tag Expression Syntax

You can combine tags with logical operators supported by Cucumber:

- `@tag1 and @tag2`
- `@tag1 or @tag2`
- `not @tag3`

Group with parentheses if needed:

```powershell
npm run bdd -- --tags "(@smoke or @regression) and not @wip"
```

### Adding New Profiles

To add a new profile keyword (e.g. `api`):

1. Edit `src/index.ts` and extend the `profileTags` map:
	```ts
	const profileTags: ProfileTagMap = {
	  smoke: "@smoke",
	  regression: "@regression",
	  login: "@login",
	  api: "@api"
	};
	```
2. (Optional) Add a convenience npm script to `package.json`:
	```json
	"test:api": "npm run bdd -- api"
	```

Then run:
```powershell
npm run test:api
```

## Parallelism & Retries

Configure via environment variables:

- `PARALLEL` (default 1) number of parallel workers for cucumber-js
- `RETRY` (default 0) cucumber retry attempts for failing scenarios

Example:
```powershell
$env:PARALLEL=4; $env:RETRY=1; npm run test:regression
```

## Allure Reporting

Allure is configured in `playwright.config.js` (ensure it exports an `allure` object). After a run, generate/open report:

```powershell
npm run allure:open
```

If `allure.generate` is set to true in config, reports are auto-generated. History is preserved unless `allure.clean` is enabled.

## Quick Reference

| Task | Command (PowerShell) |
|------|----------------------|
| Run smoke | `npm run test:smoke` |
| Run regression | `npm run test:regression` |
| Custom expression | `npm run bdd -- --tags "@smoke and not @wip"` |
| Use env TAGS | `$env:TAGS='@login'; npm run bdd` |
| Multi workers | `$env:PARALLEL=4; npm run test:smoke` |
| With retry | `$env:RETRY=1; npm run test:smoke` |

## Troubleshooting

1. No scenarios executed (0 scenarios): Ensure your tag expression actually matches scenarios. Example: a scenario tagged `@regression` won't run if you pass `--tags "@smoke"`.
2. Quotes on Windows: Always wrap complex expressions in double quotes. If nesting, prefer single quotes inside: `"(@smoke or @regression) and not @wip"`.
3. Clearing stale results: Delete `allure-results/` and `allureReport/` or set `allure.clean=true` in config before the run.

## Adding Tags To Scenarios

Add tags on the line(s) directly above `Feature:` or individual `Scenario:`:

```feature
@smoke @regression
Scenario: Validate something
  Given ...
```

Those scenarios will match either `@smoke` or `@regression` depending on your expression.

