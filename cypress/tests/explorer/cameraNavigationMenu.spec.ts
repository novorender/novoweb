context("Camera navigation menu", () => {
    it("Camera navigation buttons", () => {
        cy.loadScene();

        // cant interact properly with the 3d canvas so these tests doesn't do a whole lot

        cy.get("#canvasnavigation-actions").find("button").as("canvasNavigationButtons").should("be.visible");

        cy.getBySel("home").click();

        cy.getBySel("camera-speed").click().invoke("attr", "title").should("eq", "Camera speed - Fast");
        cy.getBySel("camera-speed").click().invoke("attr", "title").should("eq", "Camera speed - Slow");
        cy.getBySel("camera-speed").click().invoke("attr", "title").should("eq", "Camera speed - Normal");

        cy.getBySel("step-back").should("be.disabled");
        cy.getBySel("step-forwards").should("be.disabled");

        cy.getBySel("canvas-navigation-menu-fab").click();
        cy.get("#canvasnavigation-actions").should("not.be.visible");
    });
});
