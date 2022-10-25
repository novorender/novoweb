import { Box, useTheme } from "@mui/material";

import { useAppSelector } from "app/redux-store-interactions";
import LocationHud from "features/locationHud/locationHud";
import { Minimap } from "features/minimap";
import { NavigationCube } from "features/navigationCube";
import { PickerEscSnackbar } from "features/pickerEscSnackbar/pickerEscSnackbar";
import { PrimaryMenu, PrimaryMenuNew } from "features/primaryMenu";
import { QuickAccessMenu } from "features/quickAccessMenu/quickAccessMenu";
import { selectNavigationCube } from "features/render";
import { SelectionModifierMenu } from "features/selectionModifierMenu";
import { WidgetGroupPanel } from "features/widgetGroupPanel/widgetGroupPanel";
import { Widgets } from "features/widgets";
import { useHandleWidgetLayout } from "features/widgets/useHandleWidgetLayout";
import { selectNewDesign, selectWidgetLayout } from "slices/explorer";

import GlobalSnackbar from "./globalSnackbar";

const minimap = true; // todo

export function Hud() {
    const newDesign = useAppSelector(selectNewDesign);

    return (
        <>
            {newDesign ? <HudNew /> : <HudOld />}
            {/* <NewDesignPopup /> */}
        </>
    );
}

function HudNew() {
    const navigationCube = useAppSelector(selectNavigationCube);
    const theme = useTheme();

    useHandleWidgetLayout();

    return (
        <>
            {navigationCube.enabled && <NavigationCube />}
            {minimap && <Minimap />}
            <Box
                sx={{
                    position: "absolute",
                    inset: theme.spacing(theme.customSpacing.hudPadding),
                    pointerEvents: "none",
                }}
            >
                <LocationHud />
                <QuickAccessMenu />
                <WidgetGroupPanel />
                <PrimaryMenuNew />
                <Widgets />
                <GlobalSnackbar />
                <PickerEscSnackbar />
            </Box>
        </>
    );
}

function HudOld() {
    const navigationCube = useAppSelector(selectNavigationCube);

    useHandleWidgetLayout();
    const layout = useAppSelector(selectWidgetLayout);

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
