import type { Scene, View } from "@novorender/webgl-api";
import { Box, useMediaQuery, useTheme } from "@material-ui/core";

import { SelectionModifierMenu } from "features/selectionModifierMenu";
import { CameraNavigationMenu } from "features/cameraNavigationMenu";
import { Widgets } from "features/widgets";

type Props = {
    scene: Scene;
    view: View;
};

const largeFabButtonDiameter = 40;

export function Hud({ view, scene }: Props) {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

    return (
        <>
            <Box
                position="absolute"
                bottom={0}
                width={isSmall ? "100%" : `calc(50% + ${largeFabButtonDiameter / 2}px)`}
                padding={{ xs: 1, sm: 3 }}
                pr={{ xs: 1, sm: 3, md: 0 }}
                pt={{ xs: 1, sm: 3, md: 0 }}
                display="flex"
                justifyContent="space-between"
                alignItems="flex-end"
                style={{ pointerEvents: "none" }}
            >
                <SelectionModifierMenu />
                <CameraNavigationMenu view={view} />
                {isSmall ? <Widgets scene={scene} view={view} /> : null}
            </Box>
            {!isSmall ? (
                <Box position="absolute" bottom={theme.spacing(3)} right={theme.spacing(3)}>
                    <Widgets scene={scene} view={view} />
                </Box>
            ) : null}
        </>
    );
}
