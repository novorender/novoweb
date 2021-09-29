import { ObjectGroup } from "@novorender/data-js-api";
import { defaultScene } from "support/constants";

// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

Cypress.Commands.add("getBySel", (selector, ...args) => {
    return cy.get(`[data-test=${selector}]`, ...args);
});

Cypress.Commands.add("getBySelLike", (selector, ...args) => {
    return cy.get(`[data-test*=${selector}]`, ...args);
});

Cypress.Commands.add("findBySel", { prevSubject: true }, (subject, selector, ...args) => {
    return subject.find(`[data-test=${selector}]`, ...args);
});

Cypress.Commands.add("findBySelLike", { prevSubject: true }, (subject, selector, ...args) => {
    return subject.find(`[data-test*=${selector}]`, ...args);
});

Cypress.Commands.add("closestBySel", { prevSubject: true }, (subject, selector, ...args) => {
    return subject.closest(`[data-test=${selector}]`, ...args);
});

Cypress.Commands.add("closestBySelLike", { prevSubject: true }, (subject, selector, ...args) => {
    return subject.closest(`[data-test*=${selector}]`, ...args);
});

Cypress.Commands.add("loadScene", (id: string = defaultScene) => {
    cy.visit(id);
    cy.intercept("GET", "https://novorenderblobs.blob.core.windows.net/*/**").as("blobs");

    cy.wait("@blobs");
    cy.wait("@blobs");
    cy.wait("@blobs");
    cy.wait("@blobs");
    cy.wait("@blobs");
    cy.wait("@blobs");
    cy.wait("@blobs");
    cy.wait("@blobs");
    cy.wait("@blobs");

    cy.window().its("appFullyRendered", { timeout: 30000 }).should("eq", true);
});

Cypress.Commands.add("getState", (path?: string) => {
    return cy
        .window()
        .its("store")
        .invoke("getState")
        .then((state) => (path ? cy.wrap(state).its(path) : state));
});

Cypress.Commands.add("getHidden", () => {
    return cy.window().its("contexts.hidden.state.ids");
});

Cypress.Commands.add("getHighlighted", () => {
    return cy.window().its("contexts.highlighted.state.ids");
});

Cypress.Commands.add("getHighlightColor", () => {
    return cy.window().its("contexts.highlighted.state.color");
});

Cypress.Commands.add("getCustomGroups", () => {
    return cy.window().its("contexts.customGroups.state");
});

Cypress.Commands.add("setCustomGroups", (groups: ObjectGroup[]) => {
    return cy.window().its("contexts.customGroups").invoke("dispatch", { type: 1, state: groups });
});

Cypress.Commands.add("dispatch", <T>(action: { type: string; payload?: T }) => {
    cy.window().its("store").invoke("dispatch", action);
});

Cypress.Commands.add("setMainObject", (payload: number) => {
    cy.dispatch({ type: "render/setMainObject", payload });
});

Cypress.Commands.add("openWidgets", (payload: string[]) => {
    cy.dispatch({ type: "explorer/addWidgetSlot", payload });
});

Cypress.Commands.add("waitForWidgetToUpdate", (selector, ...args) => {
    cy.get(selector, ...args).within(() => {
        cy.getBySel("loading-bar").should("exist");
        cy.getBySel("loading-bar").should("not.exist");
    });
});
