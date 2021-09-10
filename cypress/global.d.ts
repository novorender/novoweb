/// <reference types="cypress" />

declare namespace Cypress {
    interface Chainable {
        getBySel(dataTestAttribute: string, args?: any): Chainable<Element>;
        getBySelLike(dataTestPrefixAttribute: string, args?: any): Chainable<Element>;
        findBySel(dataTestAttribute: string, args?: any): Chainable<Element>;
        findBySelLike(dataTestPrefixAttribute: string, args?: any): Chainable<Element>;

        loadScene(id?: string): Chainable<void>;
        waitForWidgetToUpdate(selector: string, args?: any): Chainable<void>;

        getState(): Chainable;
        dispatch<T>(action: { type: string; payload: T }): Chainable<void>;
        setMainObject(id: number): Chainable<void>;
        openWidgets(features: string[]): Chainable<void>;
    }
}
