import { GpsFixed, GpsOff } from "@mui/icons-material";
import {
    Box,
    FormControlLabel,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    useTheme,
} from "@mui/material";
import { formatDistance } from "date-fns";
import { Link } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { Divider, IosSwitch, LinearProgress, ScrollBox } from "components";

import { useAllUnitsQuery } from "../leicaApi";
import { selectProjectId, selectShowLeicaMarkers, leicaActions } from "../leicaSlice";

export function Units() {
    const theme = useTheme();
    const projectId = useAppSelector(selectProjectId);
    const showMarkers = useAppSelector(selectShowLeicaMarkers);
    const dispatch = useAppDispatch();
    const { data: units, isLoading, isError } = useAllUnitsQuery(projectId, { pollingInterval: 20 * 1000 });

    return isLoading ? (
        <LinearProgress />
    ) : (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader} sx={{ minHeight: 5, flexShrink: 0 }}>
                <>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex" justifyContent="center">
                        {units?.some((unit) => unit.location) ? (
                            <FormControlLabel
                                control={
                                    <IosSwitch
                                        size="medium"
                                        color="primary"
                                        checked={showMarkers}
                                        onChange={() => dispatch(leicaActions.toggleShowMarkers())}
                                    />
                                }
                                label={
                                    <Box fontSize={14} sx={{ userSelect: "none" }}>
                                        Show markers
                                    </Box>
                                }
                            />
                        ) : null}
                    </Box>
                </>
            </Box>
            <ScrollBox p={1} pt={2} pb={2}>
                {isError ? (
                    <Typography>Failed to load data from Leica.</Typography>
                ) : !units?.length ? (
                    <Typography>No equipment found.</Typography>
                ) : (
                    <List disablePadding sx={{ mx: -1 }}>
                        {units.map((unit) => (
                            <ListItemButton
                                disableGutters
                                key={unit.uuid}
                                component={Link}
                                to={`/units/${unit.uuid}`}
                                sx={{ px: 1 }}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: 24,
                                        minHeight: 24,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        mr: 1,
                                    }}
                                >
                                    {unit.location ? (
                                        <GpsFixed
                                            fontSize="small"
                                            color={unit.metadata.is_online ? "primary" : undefined}
                                        />
                                    ) : (
                                        <GpsOff
                                            fontSize="small"
                                            color={unit.metadata.is_online ? "primary" : undefined}
                                        />
                                    )}
                                </ListItemIcon>
                                <ListItemText>
                                    {unit.name}
                                    {unit.metadata.type_label ? ` / ${unit.metadata.type_label}` : ""}
                                    {unit.metadata.is_online
                                        ? " / Online"
                                        : unit.metadata.last_seen
                                        ? ` / ${formatDistance(new Date(unit.metadata.last_seen), new Date(), {
                                              addSuffix: true,
                                          })}`
                                        : " / Never"}
                                </ListItemText>
                            </ListItemButton>
                        ))}
                    </List>
                )}
            </ScrollBox>
        </>
    );
}
