import type { Scene, View } from "@novorender/webgl-api";
import { Box, useMediaQuery, useTheme } from "@mui/material";

import { SelectionModifierMenu } from "features/selectionModifierMenu";
import { CameraNavigationMenu } from "features/cameraNavigationMenu";
import { Widgets } from "features/widgets";
import { useAppSelector } from "app/store";
import { selectEnabledWidgets } from "slices/explorerSlice";

type Props = {
    scene: Scene;
    view: View;
};

const largeFabButtonDiameter = 40;

export function Hud({ view, scene }: Props) {
    const enabledWidgets = useAppSelector(selectEnabledWidgets);
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("md"));

    if (enabledWidgets.length < 1) {
        return <></>;
    }

    return (
        <>
            <Box
                position="absolute"
                bottom={0}
                width={isSmall ? "100%" : `calc(50% + ${largeFabButtonDiameter / 2}px)`}
                height={1}
                padding={{ xs: 1, sm: 3 }}
                pr={{ xs: 1, sm: 3, md: 0 }}
                pt={{ xs: 1, sm: 3, md: 0 }}
                display="flex"
                justifyContent="space-between"
                alignItems="flex-end"
                sx={{ pointerEvents: "none" }}
            >
                <SelectionModifierMenu />
                <CameraNavigationMenu scene={scene} view={view} />
                {isSmall ? <Widgets scene={scene} view={view} /> : null}
            </Box>
            {!isSmall ? (
                <Box
                    position="absolute"
                    bottom={theme.spacing(3)}
                    right={theme.spacing(3)}
                    height={1}
                    width={1}
                    zIndex={1}
                    sx={{ pointerEvents: "none" }}
                >
                    <Widgets scene={scene} view={view} />
                </Box>
            ) : null}
        </>
    );
}
