import { Box, useTheme } from "@mui/material";

import { useAppSelector } from "app/redux-store-interactions";
import { Divider, LogoSpeedDial, ScrollBox, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized } from "slices/explorer";

import { LanguageSelector } from "./languageSelector";

export default function Settings() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.settings.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.settings.key);

    const theme = useTheme();

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.settings} disableShadow />
                <Box
                    display={menuOpen || minimized ? "none" : "flex"}
                    flexGrow={1}
                    overflow="hidden"
                    flexDirection="column"
                >
                    <Box boxShadow={theme.customShadows.widgetHeader}>
                        <Box px={1}>
                            <Divider />
                        </Box>
                    </Box>
                    <ScrollBox height={1} mt={1} pb={3} display="flex" flexDirection="column">
                        <LanguageSelector />
                    </ScrollBox>
                </Box>
                {menuOpen && <WidgetList widgetKey={featuresConfig.settings.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} ariaLabel="toggle widget menu" />
        </>
    );
}
