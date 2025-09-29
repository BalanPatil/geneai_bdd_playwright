
@regression123
Feature: Validate Agents Page Features

        Background: Pre Condition
                Given user is on GeneAI Home Page

        Scenario: Scenario Outline name: verify required features are displayed on Agents Page
                When the user navigates to the Agents page
                Then the agents page elements should be displayed
                And user search an agent

