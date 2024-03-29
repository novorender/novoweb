import { Close } from "@mui/icons-material";
import { Box, IconButton, Typography, useTheme } from "@mui/material";

import { LogoSpeedDial, WidgetContainer } from "components";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import NovorenderIcon from "media/icons/novorender-small.svg?react";

export function MenuWidget() {
    const theme = useTheme();

    const [open, toggle] = useToggle(false);

    return (
        <>
            {open ? (
                <WidgetContainer>
                    <Box display="flex" p={1}>
                        <Box display="flex" alignItems="center">
                            <NovorenderIcon
                                style={{ fill: theme.palette.primary.main, marginRight: theme.spacing(1) }}
                            />
                            <Typography variant="body1" component="h2">
                                Functions
                            </Typography>
                        </Box>
                        <Box ml="auto">
                            <IconButton size="small" onClick={() => toggle()}>
                                <Close />
                            </IconButton>
                        </Box>
                    </Box>
                    <WidgetList onSelect={toggle} />
                </WidgetContainer>
            ) : null}
            <LogoSpeedDial open={open} toggle={toggle} />
        </>
    );
}
