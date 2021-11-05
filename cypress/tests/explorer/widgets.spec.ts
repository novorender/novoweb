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

        cy.setMainObject(47);
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

        cy.getHighlighted().should("have.length", 80);

        // Force as the button may be half covered by tooltip
        cy.contains("IsExternal").click({ force: true });
        cy.contains("ExtendToStructure").click({ force: true });
        cy.getHighlighted().should("deep.equal", [47]);

        // Checking a property on the parent object should highlight all children of parents with matching property
        cy.get("@propertiesWidget").contains("±0.00 Level").click();
        cy.get("@propertiesWidget").contains("1nq75ccsD05RaIaWZXWcl4").as("parentGuid").click();
        cy.waitForWidgetToUpdate("@propertiesWidget");

        cy.getHighlighted().should("have.length", 27);

        // Unchecking should clear highlights, except for main object itself
        cy.get("@parentGuid").click();
        cy.getHighlighted().should("deep.equal", [47]);
    });

    it("Groups", () => {
        cy.loadScene();
        cy.setCustomGroups(customGroups);
        cy.openWidgets(["groups"]);
        cy.getBySel("groups-widget");

        // Toggle all selected
        const allGroupsItemName = "Groups: 9";
        cy.contains(allGroupsItemName).click();
        cy.getCustomGroups().should((groups) => groups.forEach((group) => expect(group.selected).to.be.true));
        cy.contains(allGroupsItemName).click();
        cy.getCustomGroups().should((groups) => groups.forEach((group) => expect(group.selected).to.be.false));

        // Toggle all visibility
        cy.contains(allGroupsItemName).closest("li").findBySel("toggle-visibility").click();
        cy.getCustomGroups().should((groups) => groups.forEach((group) => expect(group.hidden).to.be.true));
        cy.contains(allGroupsItemName).closest("li").findBySel("toggle-visibility").click();
        cy.getCustomGroups().should((groups) => groups.forEach((group) => expect(group.hidden).to.be.false));

        // Toggle single selected
        const name = customGroups[3].name;
        cy.contains(name).click();
        cy.getCustomGroups().should(
            (groups) => expect(groups.find((group) => group.name === name)?.selected).to.be.true
        );
        cy.contains(name).click();
        cy.getCustomGroups().should(
            (groups) => expect(groups.find((group) => group.name === name)?.selected).to.be.false
        );

        // Toggle single visibility
        cy.contains(name).closest("li").findBySel("toggle-visibility").click();
        cy.getCustomGroups().should((groups) => expect(groups.find((group) => group.name === name)?.hidden).to.be.true);
        cy.contains(name).closest("li").findBySel("toggle-visibility").click();
        cy.getCustomGroups().should(
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
        cy.getCustomGroups().should((groups) =>
            groups
                .filter((group) => group.grouping === groupedName)
                .forEach((group) => expect(group.selected).to.be.true)
        );
        cy.get("@accordion").findBySel("toggle-highlighting").click();
        cy.getCustomGroups().should((groups) =>
            groups
                .filter((group) => group.grouping === groupedName)
                .forEach((group) => expect(group.selected).to.be.false)
        );

        // Toggle grouped visibility
        cy.get("@accordion").findBySel("toggle-visibility").click();
        cy.getCustomGroups().should((groups) =>
            groups.filter((group) => group.grouping === groupedName).forEach((group) => expect(group.hidden).to.be.true)
        );
        cy.get("@accordion").findBySel("toggle-visibility").click();
        cy.getCustomGroups().should((groups) =>
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

        cy.setMainObject(3);
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
        cy.setMainObject(47);
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.getBySel("model-tree-list-container").find("li").first().parent().parent().as("nodeList").scrollTo("top");
        cy.contains("Folder").closest("li").find("input").as("currentDepthInputs").first().click();
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.getHighlighted().should("have.length", 26);
        cy.get("@currentDepthInputs").first().click();
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.getHighlighted().should("be.empty");

        // hide all at current depth
        cy.get("@currentDepthInputs").last().click();
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.getHidden().should("have.length", 26);
        cy.get("@currentDepthInputs").last().click();
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.getHidden().should("be.empty");

        // highlight leaves
        cy.get("@nodeList").contains("Basic Wall").parents("li").as("firstLeafItem").click();
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.getHighlighted().should("deep.equal", [49]);
        cy.get("@firstLeafItem").next().as("secondLeafItem").click();
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.getHighlighted().should("deep.equal", [49, 50]);
        cy.get("@firstLeafItem").click();
        cy.get("@secondLeafItem").click();
        cy.getHighlighted().should("be.empty");

        // hide leaves
        cy.get("@firstLeafItem").find("input").last().as("firstLeafVisibility").click();
        cy.getHidden().should("deep.equal", [49]);
        cy.get("@secondLeafItem").find("input").last().as("secondLeafVisibility").click();
        cy.getHidden().should("deep.equal", [49, 50]);
        cy.get("@firstLeafVisibility").click();
        cy.get("@secondLeafVisibility").click();
        cy.getHidden().should("be.empty");

        cy.setMainObject(3);
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
        cy.getHighlighted().should("have.length", 26);
        cy.get("@highlightFolderButton").click();
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.getHighlighted().should("be.empty");

        // hide folder node
        cy.get("@hideFolderButton").click();
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.getHidden().should("have.length", 26);
        cy.get("@hideFolderButton").click();
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.getHidden().should("be.empty");

        // pop selected node to top if not already in list
        const objName = "M_Fixed:600x600 mm:2515718";
        cy.setMainObject(295);
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.contains(objName).should("not.exist");
        cy.setMainObject(344);
        cy.waitForWidgetToUpdate("@modelTreeWidget");
        cy.contains(objName);
    });
});
