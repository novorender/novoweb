/// <reference types="cypress" />

/* eslint-disable */

declare namespace Cypress {
    interface Chainable {
        getBySel(dataTestAttribute: string, args?: any): Chainable<Element>;
        getBySelLike(dataTestPrefixAttribute: string, args?: any): Chainable<Element>;
        loadViewerScene(id: string): Chainable<void>;
    }
}
