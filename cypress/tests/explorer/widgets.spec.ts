import { activeBtnColor } from "support/constants";

context("Widgets", () => {
    it("Widget menu", () => {
        cy.loadScene();

        // Open widget menu -> model tree
        cy.getBySel("widget-menu-fab").click();
        cy.contains("Model tree").click();
        cy.getBySel("widget-menu-fab").click();

        // Model tree is disabled in the menu when opening a 2nd widget
        cy.getBySel("menu-widget").contains("Model tree").siblings("button").should("be.disabled");

        // Model tree is not disabled when opening the widget menu from the model tree widget
        // The model tree button should be highlighted
        cy.getBySel("modelTree-widget-menu-fab").click();
        cy.getBySel("modelTree-widget")
            .as("modelTreeWidget")
            .findBySel("widget-list")
            .contains("Model tree")
            .siblings("button")
            .should("not.be.disabled")
            .should("have.css", "background-color", activeBtnColor)
            .click();

        // The menu should be closed and the model tree visible again
        cy.get("@modelTreeWidget").contains("Scene");
        cy.get("@modelTreeWidget").getBySel("close-widget").click();
        cy.get("@modelTreeWidget").should("not.exist");
    });

    it("Properties", () => {
        cy.loadScene();

        cy.setMainObject(1721);
        cy.openWidgets(["properties"]);
        cy.getBySel("properties-widget").as("propertiesWidget");

        // GUID; Top level property
        cy.contains("0fulNIygv0e9gah_M$tQZM");

        // Open property group
        cy.contains("Pset_WallCommon").click();

        // Check/uncheck properties under Pset_WallCommon
        cy.contains("IsExternal").click();
        cy.waitForWidgetToUpdate("@propertiesWidget");
        cy.contains("ExtendToStructure").click();
        cy.waitForWidgetToUpdate("@propertiesWidget");

        cy.getState()
            .its("render.objectGroups.default.ids")
            .should(
                "deep.equal",
                [
                    1755, 1750, 1751, 1752, 1753, 1754, 1756, 1771, 1776, 1779, 1894, 2111, 1765, 1848, 1849, 1854,
                    1859, 1860, 1865, 1888, 1889, 1891, 1746, 1748, 1749, 1757, 1761, 1762, 1764, 1766, 304, 305, 309,
                    310, 311, 313, 314, 315, 324, 325, 326, 345, 367, 371, 372, 373, 346, 347, 348, 349, 363, 364, 365,
                    366, 334, 335, 336, 337, 339, 340, 341, 342, 343, 344, 383, 384, 385, 386, 387, 388, 390, 391, 393,
                    394, 396, 397, 1720, 1721, 1722,
                ]
            );

        cy.contains("IsExternal").click("center");
        cy.contains("ExtendToStructure").click("center");
        cy.getState().its("render.objectGroups.default.ids").should("be.empty");

        // Checking a property on the parent object should highlight all children of parents with matching property
        cy.get("@propertiesWidget").contains("±0.00 Level").click();
        cy.get("@propertiesWidget").contains("1nq75ccsD05RaIaWZXWcl4").as("parentGuid").click();
        cy.waitForWidgetToUpdate("@propertiesWidget");

        cy.getState()
            .its("render.objectGroups.default.ids")
            .should(
                "deep.equal",
                [
                    1719, 558, 1723, 1724, 1725, 1726, 1727, 1728, 1729, 1730, 1731, 1732, 1733, 1734, 1735, 1736, 1737,
                    1738, 1739, 1740, 1741, 1742, 1743, 1744, 1720, 1721, 1722,
                ]
            );

        // Unchecking should clear highlights
        cy.get("@parentGuid").click();
        cy.getState().its("render.objectGroups.default.ids").should("be.empty");
    });

    it("Groups", () => {
        cy.loadScene();

        cy.getBySel("widget-menu-fab").click();
        cy.contains("Groups").click();
        cy.getBySel("groups-widget").as("groupsWidget").contains("IfcClass IfcSpace").click();
        cy.get("@groupsWidget").getBySel("close-widget").click();
    });

    it("Model tree", () => {
        cy.loadScene();
        cy.get("canvas").click("center");
        cy.getBySel("widget-menu-fab").click();
        cy.contains("Model tree").click();
        cy.getBySel("modelTree-widget").as("modelTreeWidget");
        cy.get("@modelTreeWidget").getBySel("close-widget").click();
    });
});
