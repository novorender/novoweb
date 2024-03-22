import { Add, Close, FlightTakeoff } from "@mui/icons-material";
import { Box, Button, IconButton, Typography } from "@mui/material";
import { quat } from "gl-matrix";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { CameraType, renderActions, selectStamp, StampKind } from "features/render";

import { useGetMachinesQuery } from "../api";
import { LogPointTime, selectXsiteManageActiveLogPoints, selectXsiteManageSite, xsiteManageActions } from "../slice";
import { toDBSN } from "../utils";

export function MachineLocationStamp() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const dispatch = useAppDispatch();
    const stamp = useAppSelector(selectStamp);
    const site = useAppSelector(selectXsiteManageSite);
    const showLogPointsSince = useAppSelector(selectXsiteManageActiveLogPoints);
    const { data: machines } = useGetMachinesQuery(site?.siteId ?? "", { skip: !site });

    if (stamp?.kind !== StampKind.XsiteManageMachineLocation) {
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
                    onClick={() =>
                        dispatch(
                            renderActions.setCamera({
                                type: CameraType.Pinhole,
                                goTo: {
                                    position: [
                                        stamp.data.location.position[0],
                                        stamp.data.location.position[1],
                                        view ? view.renderState.camera.position[2] : stamp.data.location.position[2],
                                    ],
                                    rotation: view ? quat.clone(view.renderState.camera.rotation) : [0, 0, 0, 1],
                                },
                            })
                        )
                    }
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
