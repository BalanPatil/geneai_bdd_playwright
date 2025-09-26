// Playwright config used here only as a central place to declare Allure reporting settings
// for the Cucumber + Playwright hybrid framework. We are NOT using the Playwright test runner
// for specs; instead index.ts imports these settings to drive allure-cucumberjs.

module.exports = {
	// Custom block consumed by src/index.ts
	allure: {
		resultsDir: 'allure-results',      // Raw result json files
		reportDir: 'allureReport',         // Generated static report
		clean: true,                       // Clean old results before run
		generate: true,                    // Auto-generate report after run
		environment: true                  // Produce environment.properties & executor.json
	}
};

