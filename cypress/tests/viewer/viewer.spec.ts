const defaultBtnColor = "rgb(37, 55, 70)";
const activeBtnColor = "rgb(214, 30, 92)";

context("Unauthenticated viewer functionality", () => {
    it("Selection modifiers", () => {
        cy.loadViewerScene("d8b71054c84d4c8088b5b92f2c7839f0");

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
            .should("have.css", "background-color", defaultBtnColor)
            .click()
            .should("have.css", "background-color", activeBtnColor)
            .click()
            .should("have.css", "background-color", defaultBtnColor);

        // Selection color on/off and picker window open/close
        cy.getBySel("selection-color")
            .should("have.css", "background-color", defaultBtnColor)
            .click()
            .should("have.css", "background-color", activeBtnColor)
            .then($btn => {
                cy.getBySel("selection-color-picker");
                cy.wrap($btn).click();
                cy.getBySel("selection-color-picker").should("not.exist");
                cy.wrap($btn);
            })
            .should("have.css", "background-color", defaultBtnColor);

        // View only selected on/off
        cy.getBySel("view-only-selected")
            .should("have.css", "background-color", defaultBtnColor)
            .click()
            .should("have.css", "background-color", activeBtnColor)
            .click()
            .should("have.css", "background-color", defaultBtnColor);

        // Hide and clear selected disabled when none selected
        cy.getBySel("hide-selected").should("not.be.disabled");
        cy.getBySel("clear-selection").should("not.be.disabled").click().should("be.disabled");
        cy.getBySel("hide-selected").should("be.disabled");
        cy.get("canvas").click("center");
        cy.getBySel("hide-selected").should("not.be.disabled");
        cy.getBySel("clear-selection").should("not.be.disabled");
    });

    it("Canvas navigation", () => {
        cy.loadViewerScene("d8b71054c84d4c8088b5b92f2c7839f0");

        // cant interact properly with the 3d canvas so these tests doesn't do a whole lot

        cy.get("#canvasnavigation-actions").find("button").as("canvasNavigationButtons").should("be.visible");

        cy.getBySel("home").click();

        cy.getBySel("camera-speed").click().invoke("attr", "title").should("eq", "Camera Speed - Fast");
        cy.getBySel("camera-speed").click().invoke("attr", "title").should("eq", "Camera Speed - Slow");
        cy.getBySel("camera-speed").click().invoke("attr", "title").should("eq", "Camera Speed - Normal");

        cy.getBySel("step-back").should("be.disabled");
        cy.getBySel("step-forwards").should("be.disabled");

        cy.getBySel("canvas-navigation-menu-fab").click();
        cy.get("#canvasnavigation-actions").should("not.be.visible");
    });

    context("Widgets", () => {
        it("Properties", () => {
            cy.loadViewerScene("d8b71054c84d4c8088b5b92f2c7839f0");

            cy.get("canvas").click("center");
            cy.getBySel("widget-menu-fab").click();
            cy.contains("Properties").click();
            cy.getBySel("properties").as("propertiesWidget").contains("Pset_BeamCommon").click();
            cy.get("@propertiesWidget").contains("Span").click();
            cy.get("@propertiesWidget").getBySel("loading-bar").should("exist");
            cy.get("@propertiesWidget").getBySel("loading-bar").should("not.exist");
            cy.get("@propertiesWidget").getBySel("close-widget").click();
        });

        it("Groups", () => {
            cy.loadViewerScene("d8b71054c84d4c8088b5b92f2c7839f0");

            cy.getBySel("widget-menu-fab").click();
            cy.contains("Groups").click();
            cy.getBySel("groups").as("groupsWidget").contains("SHEATHING").click();
            cy.get("@groupsWidget").getBySel("close-widget").click();
        });

        it("Model Tree", () => {
            cy.loadViewerScene("d8b71054c84d4c8088b5b92f2c7839f0");
            cy.get("canvas").click("center");
            cy.getBySel("widget-menu-fab").click();
            cy.contains("Model Tree").click();
            cy.getBySel("modelTree").as("modelTreeWidget");
            cy.get("@modelTreeWidget").getBySel("close-widget").click();
        });
    });
});
