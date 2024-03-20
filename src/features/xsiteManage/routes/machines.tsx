import { GpsFixed, GpsOff } from "@mui/icons-material";
import { Box, FormControlLabel, ListItemButton, ListItemIcon, ListItemText, useTheme } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useHistory } from "react-router-dom";
import AutoSizer from "react-virtualized-auto-sizer";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, FixedSizeVirualizedList, IosSwitch, LinearProgress, ScrollBox } from "components";
import { msToHrs } from "utils/time";

import { useGetMachinesQuery } from "../api";
import {
    selectXsiteManageMachineLocations,
    selectXsiteManageMachinesScrollOffset,
    selectXsiteManageShowLogPointMarkers,
    selectXsiteManageShowMachineMarkers,
    selectXsiteManageSite,
    xsiteManageActions,
} from "../slice";
import { Machine } from "../types";

export function Machines() {
    const theme = useTheme();
    const history = useHistory();
    const dispatch = useAppDispatch();

    const scrollOffset = useAppSelector(selectXsiteManageMachinesScrollOffset);
    const site = useAppSelector(selectXsiteManageSite);
    const machineLocations = useAppSelector(selectXsiteManageMachineLocations);
    const showMachineMarkers = useAppSelector(selectXsiteManageShowMachineMarkers);
    const showLogPointMarkers = useAppSelector(selectXsiteManageShowLogPointMarkers);
    const {
        data: machines,
        isFetching: isFetchingMachines,
        isError: machinesError,
    } = useGetMachinesQuery(site?.siteId ?? "", { skip: !site });

    const scrollPos = useRef(scrollOffset);
    const nowRef = useRef(Date.now());
    const [sortedMachines, setSortedMachines] = useState([] as Machine[]);

    useEffect(() => {
        const now = Date.now();
        nowRef.current = now;

        setSortedMachines(
            [...(machines ?? [])].sort((a, b) => {
                const locationA = machineLocations[a.machineId]?.timestampMs ?? 0;
                const locationB = machineLocations[b.machineId]?.timestampMs ?? 0;

                if (!locationA && !locationB) {
                    return 0;
                }

                if (!locationA) {
                    return 1;
                } else if (!locationB) {
                    return -1;
                }

                return isActive(now, locationA) && isActive(now, locationB) ? 0 : isActive(now, locationA) ? -1 : 1;
            })
        );
    }, [machines, machineLocations]);

    useEffect(() => {
        return () => {
            dispatch(xsiteManageActions.setMachinesScrollOffset(scrollPos.current));
        };
    }, [dispatch]);

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex">
                        <FormControlLabel
                            sx={{ ml: 1 }}
                            control={
                                <IosSwitch
                                    size="medium"
                                    color="primary"
                                    checked={showMachineMarkers}
                                    onChange={() => dispatch(xsiteManageActions.toggleShowMachineMarkers())}
                                />
                            }
                            label={
                                <Box fontSize={14} sx={{ userSelect: "none" }}>
                                    Machines
                                </Box>
                            }
                        />
                        <FormControlLabel
                            sx={{ ml: 1 }}
                            control={
                                <IosSwitch
                                    size="medium"
                                    color="primary"
                                    checked={showLogPointMarkers}
                                    onChange={() => dispatch(xsiteManageActions.toggleShowLogPointMarkers())}
                                />
                            }
                            label={
                                <Box fontSize={14} sx={{ userSelect: "none" }}>
                                    Log points
                                </Box>
                            }
                        />
                    </Box>
                </>
            </Box>
            {isFetchingMachines && (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            )}
            {!sortedMachines ? null : sortedMachines.length ? (
                <Box flex={"1 1 100%"}>
                    <AutoSizer>
                        {({ height, width }) => (
                            <FixedSizeVirualizedList
                                style={{ paddingLeft: theme.spacing(1), paddingRight: theme.spacing(1) }}
                                height={height}
                                width={width}
                                itemSize={40}
                                overscanCount={3}
                                itemCount={sortedMachines.length}
                                initialScrollOffset={scrollOffset}
                                onScroll={(e) => {
                                    scrollPos.current = e.scrollOffset;
                                }}
                            >
                                {({ index, style }) => {
                                    const machine = sortedMachines[index];
                                    const location = machineLocations[machine.machineId];

                                    return (
                                        <ListItemButton
                                            style={style}
                                            sx={{ py: 0.5, px: 1 }}
                                            disableGutters
                                            key={machine.machineId}
                                            onClick={() => {
                                                history.push(`/machines/${machine.machineId}`);
                                                dispatch(
                                                    xsiteManageActions.activateLogPoints({
                                                        machine: machine.machineId,
                                                    })
                                                );
                                            }}
                                            onMouseEnter={() => {
                                                dispatch(xsiteManageActions.setHoveredMachine(machine.machineId));
                                            }}
                                            onMouseLeave={() => {
                                                dispatch(xsiteManageActions.setHoveredMachine(""));
                                            }}
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
                                                {location ? (
                                                    <GpsFixed
                                                        fontSize="small"
                                                        color={
                                                            isActive(nowRef.current, location.timestampMs)
                                                                ? "primary"
                                                                : undefined
                                                        }
                                                    />
                                                ) : (
                                                    <GpsOff fontSize="small" />
                                                )}
                                            </ListItemIcon>
                                            <ListItemText>{machine.name}</ListItemText>
                                        </ListItemButton>
                                    );
                                }}
                            </FixedSizeVirualizedList>
                        )}
                    </AutoSizer>
                </Box>
            ) : (
                <ScrollBox p={1} pb={3}>
                    {machinesError && "An error occurred while loading machines."}
                    {machines?.length === 0 && "No machines found."}
                </ScrollBox>
            )}
        </>
    );
}

function isActive(now: number, timestamp: number): boolean {
    return msToHrs(now - timestamp) <= 1;
}
