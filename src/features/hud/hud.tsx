import { Box } from "@mui/material";

import { useAppSelector } from "app/store";
import { NavigationCube } from "features/navigationCube";
import { PrimaryMenu } from "features/primaryMenu";
import { selectNavigationCube } from "features/render";
import { SelectionModifierMenu } from "features/selectionModifierMenu";
import { Widgets } from "features/widgets";
import { useWidgetLayout } from "features/widgets/useWidgetLayout";

export function Hud() {
    const navigationCube = useAppSelector(selectNavigationCube);
    const layout = useWidgetLayout();

    const getGridLayout = () => {
        if (layout.widgets === 4) {
            return {
                gridTemplateColumns: "1fr 1fr repeat(2, minmax(420px, 1fr))",
                gridTemplateRows: "repeat(2, minmax(0, 1fr))",
            };
        } else if (layout.widgets === 2) {
            return {
                gridTemplateColumns: "1fr 1fr minmax(420px, 1fr)",
                gridTemplateRows: "repeat(2, minmax(0, 1fr))",
            };
        } else if (layout.widgets === 1 && layout.sideBySide) {
            return {
                gridTemplateColumns: "1fr 1fr minmax(420px, 1fr)",
                gridTemplateRows: "repeat(2, 1fr)",
            };
        } else if (layout.widgets === 1 && !layout.sideBySide) {
            return {
                gridTemplateColumns: "1fr 1fr 1fr",
                gridTemplateRows: "repeat(2, minmax(0, 1fr))",
            };
        }
    };

    return (
        <>
            {navigationCube.enabled && <NavigationCube />}
            <Box
                position="absolute"
                top={0}
                right={0}
                bottom={0}
                left={0}
                padding={2}
                display="grid"
                sx={{
                    pointerEvents: "none",
                    ...getGridLayout(),
                }}
            >
                <SelectionModifierMenu />
                <PrimaryMenu />
                <Widgets />
            </Box>
        </>
    );
}
