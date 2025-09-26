
@smoke
Feature: Gene AI Home Page features validation

    Background: Pre Condition
        Given user is on GeneAI Home Page
    Scenario: Validate the required features on GeneAI Home Page
        Then verify the newChat link is present on Home Page
        And verify the Agents link is present on Home Page
        And verify the Ask our Docs link is present on Home Page
        And verify the My Docs link is present on Home Page
