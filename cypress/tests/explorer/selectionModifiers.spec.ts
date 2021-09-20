import { defaultToggleableBtnColor, activeToggleableBtnColor } from "support/constants";

context("Selection modifier menu", () => {
    it("Selection modifiers", () => {
        cy.loadScene();

        // Open automatically the first time an object is selected
        cy.get("#selectionmodifiers-actions").find("button").as("selectionModifierButtons").should("not.be.visible");
        cy.get("canvas").click("center");
        cy.get("@selectionModifierButtons").should("be.visible");

        // Manually close and open
        cy.getBySel("selection-modifier-menu-fab").click();
        cy.get("@selectionModifierButtons").should("not.be.visible");
        cy.getBySel("selection-modifier-menu-fab").click();
        cy.get("@selectionModifierButtons").should("be.visible");

        // Multiple selection on/off
        cy.getBySel("multiple-selection")
            .should("have.css", "background-color", defaultToggleableBtnColor)
            .click()
            .should("have.css", "background-color", activeToggleableBtnColor)
            .click()
            .should("have.css", "background-color", defaultToggleableBtnColor);

        // Selection color on/off and picker window open/close
        cy.getBySel("selection-color")
            .should("have.css", "background-color", defaultToggleableBtnColor)
            .click()
            .should("have.css", "background-color", activeToggleableBtnColor)
            .then(($btn) => {
                cy.getBySel("selection-color-picker");
                cy.wrap($btn).click();
                cy.getBySel("selection-color-picker").should("not.exist");
                cy.wrap($btn);
            })
            .should("have.css", "background-color", defaultToggleableBtnColor);

        // View only selected on/off
        cy.getBySel("view-only-selected")
            .should("have.css", "background-color", defaultToggleableBtnColor)
            .click()
            .should("have.css", "background-color", activeToggleableBtnColor)
            .click()
            .should("have.css", "background-color", defaultToggleableBtnColor);

        // Hide and clear selected disabled when none selected
        cy.getBySel("hide-selected").should("not.be.disabled");
        cy.getBySel("clear-selection").should("not.be.disabled").click().should("be.disabled");
        cy.getBySel("hide-selected").should("be.disabled");
        cy.get("canvas").click("center");
        cy.getBySel("hide-selected").should("not.be.disabled");
        cy.getBySel("clear-selection").should("not.be.disabled");
    });
});
