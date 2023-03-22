import { quat } from "gl-matrix";
import { Box, Typography, IconButton, Button } from "@mui/material";
import { Add, Close, FlightTakeoff } from "@mui/icons-material";

import { Divider } from "components";
import { renderActions, CameraType, selectStamp, StampKind } from "features/render";
import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { toDBSN } from "../utils";
import { useGetMachinesQuery } from "../api";
import { LogPointTime, selectXsiteManageActiveLogPoints, selectXsiteManageSite, xsiteManageActions } from "../slice";

export function MachineLocationStamp() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const dispatch = useAppDispatch();
    const stamp = useAppSelector(selectStamp);
    const site = useAppSelector(selectXsiteManageSite);
    const showLogPointsSince = useAppSelector(selectXsiteManageActiveLogPoints);
    const { data: machines } = useGetMachinesQuery(site?.siteId ?? "", { skip: !site });

    if (stamp?.kind !== StampKind.MachineLocation) {
        return null;
    }

    return (
        <Box px={2} pb={1} sx={{ pointerEvents: "auto" }}>
            <Box display="flex" alignItems={"center"} justifyContent={"space-between"}>
                <Typography fontWeight={600}>
                    {machines?.find((machine) => machine.machineId === stamp.data.location.machineId)?.name ??
                        "Loading name..."}
                </Typography>
                <IconButton size="small" onClick={() => dispatch(renderActions.setStamp(null))}>
                    <Close />
                </IconButton>
            </Box>
            <Divider sx={{ mb: 0.5 }} />
            DBSN: {toDBSN(stamp.data.location.machineId)} <br />
            Latitude: {stamp.data.location.latitude} <br />
            Longitude: {stamp.data.location.longitude} <br />
            Time: {new Date(stamp.data.location.timestampMs).toLocaleString()}
            <Box mt={1}>
                <Button
                    variant="outlined"
                    color="secondary"
                    sx={{ minWidth: 170, display: "flex", justifyContent: "center" }}
                    onClick={(e) => {
                        console.log(e);
                        e.stopPropagation();
                        dispatch(
                            renderActions.setCamera({
                                type: CameraType.Flight,
                                goTo: {
                                    position: [
                                        stamp.data.location.position[0],
                                        view
                                            ? (view.camera.controller as any).outputPosition[1]
                                            : stamp.data.location.position[1],
                                        stamp.data.location.position[2],
                                    ],
                                    rotation: view ? quat.clone(view.camera.rotation) : [0, 0, 0, 1],
                                },
                            })
                        );
                    }}
                >
                    <FlightTakeoff sx={{ mr: 1 }} />
                    Fly to machine
                </Button>
            </Box>
            <Box mt={1.5} mb={1}>
                <Button
                    variant="outlined"
                    color="secondary"
                    sx={{ minWidth: 170, display: "flex", justifyContent: "center" }}
                    onClick={() => {
                        const machine = stamp.data.location.machineId;
                        dispatch(
                            xsiteManageActions.activateLogPoints({
                                machine,
                                time: showLogPointsSince === LogPointTime.None ? LogPointTime.Day : showLogPointsSince,
                            })
                        );
                        dispatch(xsiteManageActions.setClickedMarker(machine));
                        dispatch(xsiteManageActions.toggleShowLogPointMarkers(true));
                        dispatch(renderActions.setStamp(null));
                    }}
                >
                    <Add sx={{ mr: 1 }} />
                    Show log points
                </Button>
            </Box>
        </Box>
    );
}
