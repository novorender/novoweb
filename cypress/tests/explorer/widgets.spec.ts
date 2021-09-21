import { customGroups } from "fixtures/groups";
import { activeToggleableBtnColor } from "support/constants";

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
            .should("have.css", "background-color", activeToggleableBtnColor)
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

        // Force as the button may be half covered by tooltip
        cy.contains("IsExternal").click({ force: true });
        cy.contains("ExtendToStructure").click({ force: true });
        cy.getState("render.objectGroups.default.ids").should("be.empty");

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
        cy.dispatch({ type: "render/setObjectGroups", payload: { custom: customGroups } });
        cy.openWidgets(["groups"]);
        cy.getBySel("groups-widget");

        // Toggle all selected
        const allGroupsItemName = "Groups: 9";
        cy.contains(allGroupsItemName).click();
        cy.getState("render.objectGroups.custom").should((groups) =>
            groups.forEach((group) => expect(group.selected).to.be.true)
        );
        cy.contains(allGroupsItemName).click();
        cy.getState("render.objectGroups.custom").should((groups) =>
            groups.forEach((group) => expect(group.selected).to.be.false)
        );

        // Toggle all visibility
        cy.contains(allGroupsItemName).closest("li").findBySel("toggle-visibility").click();
        cy.getState("render.objectGroups.custom").should((groups) =>
            groups.forEach((group) => expect(group.hidden).to.be.true)
        );
        cy.contains(allGroupsItemName).closest("li").findBySel("toggle-visibility").click();
        cy.getState("render.objectGroups.custom").should((groups) =>
            groups.forEach((group) => expect(group.hidden).to.be.false)
        );

        // Toggle single selected
        const name = customGroups[3].name;
        cy.contains(name).click();
        cy.getState("render.objectGroups.custom").should(
            (groups) => expect(groups.find((group) => group.name === name)?.selected).to.be.true
        );
        cy.contains(name).click();
        cy.getState("render.objectGroups.custom").should(
            (groups) => expect(groups.find((group) => group.name === name)?.selected).to.be.false
        );

        // Toggle single visibility
        cy.contains(name).closest("li").findBySel("toggle-visibility").click();
        cy.getState("render.objectGroups.custom").should(
            (groups) => expect(groups.find((group) => group.name === name)?.hidden).to.be.true
        );
        cy.contains(name).closest("li").findBySel("toggle-visibility").click();
        cy.getState("render.objectGroups.custom").should(
            (groups) => expect(groups.find((group) => group.name === name)?.hidden).to.be.false
        );

        // Toggle grouped accordion
        const groupedName = customGroups[4].grouping;
        const subGroup = customGroups[4].name;
        cy.contains(subGroup).should("not.be.visible");
        cy.contains(groupedName).click();
        cy.contains(subGroup).should("be.visible");

        // Toggle grouped selected
        cy.contains(groupedName)
            .closest(".MuiAccordionSummary-root")
            .as("accordion")
            .findBySel("toggle-highlighting")
            .click();
        cy.getState("render.objectGroups.custom").should((groups) =>
            groups
                .filter((group) => group.grouping === groupedName)
                .forEach((group) => expect(group.selected).to.be.true)
        );
        cy.get("@accordion").findBySel("toggle-highlighting").click();
        cy.getState("render.objectGroups.custom").should((groups) =>
            groups
                .filter((group) => group.grouping === groupedName)
                .forEach((group) => expect(group.selected).to.be.false)
        );

        // Toggle grouped visibility
        cy.get("@accordion").findBySel("toggle-visibility").click();
        cy.getState("render.objectGroups.custom").should((groups) =>
            groups.filter((group) => group.grouping === groupedName).forEach((group) => expect(group.hidden).to.be.true)
        );
        cy.get("@accordion").findBySel("toggle-visibility").click();
        cy.getState("render.objectGroups.custom").should((groups) =>
            groups
                .filter((group) => group.grouping === groupedName)
                .forEach((group) => expect(group.hidden).to.be.false)
        );
    });

    it("Model tree", () => {
        cy.loadScene();
        cy.openWidgets(["modelTree"]);
        cy.getBySel("modelTree-widget").as("modelTreeWidget");

        // breadcrumbs & navigation
        cy.getBySel("breadcrumbs").find("button").should("have.length", 1);
        cy.getBySel("breadcrumbs").contains("Scene");
        cy.contains("3").click();
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.getBySel("breadcrumbs").find("button").should("have.length", 2);
        cy.getBySel("breadcrumbs").contains("3");
        cy.getBySel("breadcrumbs").contains("Scene").click();
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.getBySel("breadcrumbs").find("button").should("have.length", 1);
        cy.getBySel("breadcrumbs").contains("Scene");

        cy.setMainObject(1721);
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.getBySel("breadcrumbs").find("button").should("have.length", 3);
        cy.getBySel("breadcrumbs").contains("Scene").should("not.exist");
        cy.getBySel("expand-breadcrumbs").click();
        cy.getBySel("expanded-breadcrumbs").find("button").should("have.length", 3);
        cy.getBySel("expanded-breadcrumbs").contains("Scene").click();

        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.getBySel("breadcrumbs").find("button").should("have.length", 1);

        // current depth item not at root
        cy.contains("Folder").should("not.exist");

        // highlight all at current depth
        cy.setMainObject(1721);
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.getBySel("model-tree-list-container").find("li").first().parent().parent().as("nodeList").scrollTo("top");
        cy.contains("Folder").closest("li").find("input").as("currentDepthInputs").first().click();
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.getState("render.objectGroups.default.ids").should(
            "deep.equal",
            [
                1723, 1724, 1725, 1726, 1727, 1728, 1729, 1730, 1731, 1732, 1733, 1734, 1735, 1736, 1737, 1738, 1739,
                1740, 1741, 1742, 1743, 1744, 1720, 1721, 1722, 1719,
            ]
        );
        cy.get("@currentDepthInputs").first().click();
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.getState("render.objectGroups.default.ids").should("be.empty");

        // hide all at current depth
        cy.get("@currentDepthInputs").last().click();
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.getState("render.objectGroups.defaultHidden.ids").should(
            "deep.equal",
            [
                1723, 1724, 1725, 1726, 1727, 1728, 1729, 1730, 1731, 1732, 1733, 1734, 1735, 1736, 1737, 1738, 1739,
                1740, 1741, 1742, 1743, 1744, 1720, 1721, 1722, 1719,
            ]
        );
        cy.get("@currentDepthInputs").last().click();
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.getState("render.objectGroups.defaultHidden.ids").should("be.empty");

        // highlight leaves
        cy.get("@nodeList").contains("Basic Wall").parents("li").as("firstLeafItem").click();
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.getState("render.objectGroups.default.ids").should("deep.equal", [1723]);
        cy.get("@firstLeafItem").next().as("secondLeafItem").click();
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.getState("render.objectGroups.default.ids").should("deep.equal", [1723, 1724]);
        cy.get("@firstLeafItem").click();
        cy.get("@secondLeafItem").click();
        cy.getState("render.objectGroups.default.ids").should("be.empty");

        // hide leaves
        cy.get("@firstLeafItem").find("input").last().as("firstLeafVisibility").click();
        cy.getState("render.objectGroups.defaultHidden.ids").should("deep.equal", [1723]);
        cy.get("@secondLeafItem").find("input").last().as("secondLeafVisibility").click();
        cy.getState("render.objectGroups.defaultHidden.ids").should("deep.equal", [1723, 1724]);
        cy.get("@firstLeafVisibility").click();
        cy.get("@secondLeafVisibility").click();
        cy.getState("render.objectGroups.defaultHidden.ids").should("be.empty");

        cy.setMainObject(1677);
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.get("@nodeList")
            .contains("±0.00 Level")
            .parents("li")
            .find("input")
            .as("folderButtons")
            .first()
            .as("highlightFolderButton")
            .get("@folderButtons")
            .last()
            .as("hideFolderButton");

        // highlight folder node
        cy.get("@highlightFolderButton").click();
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.getState("render.objectGroups.default.ids").should(
            "deep.equal",
            [
                1723, 1724, 1725, 1726, 1727, 1728, 1729, 1730, 1731, 1732, 1733, 1734, 1735, 1736, 1737, 1738, 1739,
                1740, 1741, 1742, 1743, 1744, 1720, 1721, 1722, 1719,
            ]
        );
        cy.get("@highlightFolderButton").click();
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.getState("render.objectGroups.default.ids").should("be.empty");

        // hide folder node
        cy.get("@hideFolderButton").click();
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.getState("render.objectGroups.defaultHidden.ids").should(
            "deep.equal",
            [
                1723, 1724, 1725, 1726, 1727, 1728, 1729, 1730, 1731, 1732, 1733, 1734, 1735, 1736, 1737, 1738, 1739,
                1740, 1741, 1742, 1743, 1744, 1720, 1721, 1722, 1719,
            ]
        );
        cy.get("@hideFolderButton").click();
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.getState("render.objectGroups.defaultHidden.ids").should("be.empty");

        // pop selected node to top if not already in list
        const objName = "Basic Wall:BIMS İÇ - 200mm:2477377";
        cy.setMainObject(295);
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.contains(objName).should("not.exist");
        cy.setMainObject(344);
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.contains(objName);
    });
});
