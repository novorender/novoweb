import { Box, useTheme } from "@mui/material";
import ReactVirtualizedAutoSizer from "react-virtualized-auto-sizer";

import { useAppSelector } from "app/redux-store-interactions";
import { Divider, LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized } from "slices/explorer";

import { Clipping2d } from "./clipping2d";
import { DisplaySettingsMenu } from "./components/displaySettingsMenu";
import { PlaneSelect } from "./components/planeSelect";

export default function CrossSection() {
    const theme = useTheme();
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.crossSection.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.crossSection.key);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader
                    menuOpen={menuOpen}
                    toggleMenu={toggleMenu}
                    widget={featuresConfig.crossSection}
                    disableShadow={true}
                ></WidgetHeader>

                <Box display={menuOpen || minimized ? "none" : "block"} boxShadow={theme.customShadows.widgetHeader}>
                    <Box px={1}>
                        <Divider />
                    </Box>

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: "1fr min-content",
                            gap: 1,
                            alignItems: "center",
                            pr: 1,
                        }}
                    >
                        <PlaneSelect />
                        <DisplaySettingsMenu />
                    </Box>
                </Box>

                <Box display={menuOpen || minimized ? "none" : "block"} sx={{ width: "100%", height: "100%" }}>
                    <ReactVirtualizedAutoSizer>
                        {({ width, height }) => <Clipping2d width={width} height={height} />}
                    </ReactVirtualizedAutoSizer>
                </Box>
                {menuOpen && <WidgetList widgetKey={featuresConfig.crossSection.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}
