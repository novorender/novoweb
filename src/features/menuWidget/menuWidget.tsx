import { Box, Typography, IconButton, useTheme } from "@mui/material";
import { Close } from "@mui/icons-material";

import { LogoSpeedDial, WidgetContainer } from "components";
import { WidgetList } from "features/widgetList";
import { useToggle } from "hooks/useToggle";

import { ReactComponent as NovorenderIcon } from "media/icons/novorender-small.svg";

export function MenuWidget() {
    const theme = useTheme();

    const [open, toggle] = useToggle(false);

    return (
        <>
            {open ? (
                <WidgetContainer data-test="menu-widget" sx={{ height: 1, display: "flex", flexDirection: "column" }}>
                    <Box height="100%" display="flex" flexDirection="column">
                        <Box display="flex" p={1} boxShadow={theme.customShadows.widgetHeader}>
                            <Box display="flex" alignItems="center">
                                <NovorenderIcon
                                    style={{ fill: theme.palette.primary.main, marginRight: theme.spacing(1) }}
                                />
                                <Typography variant="body1" component="h2">
                                    Functions
                                </Typography>
                            </Box>
                            <Box ml="auto">
                                <IconButton size="small" onClick={toggle}>
                                    <Close />
                                </IconButton>
                            </Box>
                        </Box>

                        <WidgetList onSelect={toggle} />
                    </Box>
                </WidgetContainer>
            ) : null}
            <LogoSpeedDial open={open} toggle={toggle} testId="widget-menu-fab" />
        </>
    );
}
