/// <reference types="cypress" />

declare namespace Cypress {
    interface Chainable {
        getBySel(dataTestAttribute: string, args?: any): Chainable<Element>;
        getBySelLike(dataTestPrefixAttribute: string, args?: any): Chainable<Element>;
        findBySel(dataTestAttribute: string, args?: any): Chainable<Element>;
        findBySelLike(dataTestPrefixAttribute: string, args?: any): Chainable<Element>;
        closestBySel(dataTestAttribute: string, args?: any): Chainable<Element>;
        closestBySelLike(dataTestPrefixAttribute: string, args?: any): Chainable<Element>;

        loadScene(id?: string): Chainable<void>;
        waitForWidgetToUpdate(selector: string, args?: any): Chainable<void>;

        getState(path?: string): Chainable;
        dispatch<T>(action: { type: string; payload: T }): Chainable<void>;
        setMainObject(id: number): Chainable<void>;
        openWidgets(features: string[]): Chainable<void>;

        getHidden(): Chainable<number[]>;
        getHighlighted(): Chainable<number[]>;
        getHighlightColor(): Chainable<[number, number, number]>;
        setCustomGroups(groups: any[]): Chainable<void>;
        getCustomGroups(): Chainable<any[]>;
    }
}
