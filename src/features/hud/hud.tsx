import { Box, useMediaQuery, useTheme } from "@mui/material";

import { SelectionModifierMenu } from "features/selectionModifierMenu";
import { PrimaryMenu } from "features/primaryMenu";
import { Widgets } from "features/widgets";
import { useAppSelector } from "app/store";
import { NavigationCube } from "features/navigationCube";
import { selectAdvancedSettings } from "features/render/renderSlice";

const largeFabButtonDiameter = 40;

export function Hud() {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("md"));
    const { navigationCube } = useAppSelector(selectAdvancedSettings);

    return (
        <>
            {navigationCube ? <NavigationCube /> : null}
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
                <PrimaryMenu />
                {isSmall ? <Widgets /> : null}
            </Box>
            {!isSmall ? (
                <Box
                    position="absolute"
                    bottom={theme.spacing(3)}
                    right={theme.spacing(3)}
                    height={1}
                    width={1}
                    sx={{ pointerEvents: "none" }}
                >
                    <Widgets />
                </Box>
            ) : null}
        </>
    );
}
