import { Box, Modal, Typography, useTheme } from "@mui/material";
import { ParentSizeModern } from "@visx/responsive";

import { useAppSelector } from "app/store";
import { LogoSpeedDial, ScrollBox, WidgetContainer, WidgetHeader } from "components";
import { useToggle } from "hooks/useToggle";
import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { HeightProfileChart } from "./heightProfileChart";

export function HeightProfile() {
    const theme = useTheme();
    const [menuOpen, toggleMenu] = useToggle();
    const {
        state: { measureScene },
    } = useExplorerGlobals(true);
    const minimized = useAppSelector(selectMinimized) === featuresConfig.heightProfile.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.heightProfile.key;

    (window as any).measureScene = measureScene;

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={{ ...featuresConfig.heightProfile, name: "Height profile" as any }} />
                <Modal open={true}>
                    <ScrollBox
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                        width={1}
                        height={1}
                        p={{ xs: 2, sm: 4, md: 8 }}
                    >
                        <Box
                            maxWidth={1}
                            maxHeight={1}
                            width={1}
                            height={1}
                            borderRadius="4px"
                            bgcolor={theme.palette.common.white}
                            py={8}
                            px={{ xs: 2, sm: 8 }}
                        >
                            <Typography component="h1" variant="h5" textAlign="center" mb={2}>
                                Height profile
                            </Typography>
                            <ParentSizeModern>
                                {(parent) => <HeightProfileChart height={parent.height} width={parent.width} />}
                            </ParentSizeModern>
                        </Box>
                    </ScrollBox>
                </Modal>
                <ScrollBox display={menuOpen || minimized ? "none" : "flex"} flexDirection="column" p={1}>
                    HP
                </ScrollBox>
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.heightProfile.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.heightProfile.key}-widget-menu-fab`}
            />
        </>
    );
}
