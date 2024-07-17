import { Close } from "@mui/icons-material";
import { Box, IconButton, Typography, useTheme } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { LogoSpeedDial, WidgetContainer } from "components";
import WidgetList from "features/widgetList/widgetList";
import NovorenderIcon from "media/icons/novorender-small.svg?react";
import { explorerActions, selectWidgetSlot } from "slices/explorer";

export function MenuWidget() {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const widgetSlot = useAppSelector(selectWidgetSlot);

    const open = widgetSlot.open;
    const toggle = () => {
        dispatch(explorerActions.setWidgetSlot({ ...widgetSlot, open: !widgetSlot.open }));
    };

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
                            <IconButton size="small" onClick={toggle}>
                                <Close />
                            </IconButton>
                        </Box>
                    </Box>
                    <WidgetList featureGroupKey={widgetSlot.group} onSelect={toggle} />
                </WidgetContainer>
            ) : null}
            <LogoSpeedDial open={open} toggle={toggle} />
        </>
    );
}
