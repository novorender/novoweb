import { Box, Button, useTheme } from "@mui/material";
import { vec3 } from "gl-matrix";
import { useCallback } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { getCameraDir } from "features/engine2D/utils";
import LocationHud from "features/locationHud/locationHud";
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
    const xr = useXr();

    useHandleWidgetLayout();

    return (
        <>
            {navigationCube.enabled && <NavigationCube />}
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

                <Box
                    display="flex"
                    justifyContent="center"
                    sx={{ position: "absolute", top: 0, left: 0, m: 2, width: "100%", pointerEvents: "auto" }}
                >
                    <Button variant="outlined" onClick={() => xr()}>
                        XR
                    </Button>
                </Box>
            </Box>
        </>
    );
}

function HudOld() {
    const xr = useXr();
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

                <Box
                    display="flex"
                    justifyContent="center"
                    sx={{ position: "absolute", top: 0, left: 0, m: 2, width: "100%", pointerEvents: "auto" }}
                >
                    <Button variant="outlined" onClick={() => xr()}>
                        XR
                    </Button>
                </Box>
            </Box>
        </>
    );
}

function useXr() {
    const {
        state: { view },
    } = useExplorerGlobals();

    return useCallback(async () => {
        if (!view) {
            return;
        }
        const dir = getCameraDir(view.renderState.camera.rotation);
        dir[2] = 0;
        vec3.normalize(dir, dir);
        vec3.negate(dir, dir);
        view.modifyRenderState({
            output: { xr: true },
        });
    }, [view]);
}
