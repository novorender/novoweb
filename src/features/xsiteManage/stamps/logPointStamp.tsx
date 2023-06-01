import { quat } from "gl-matrix";
import { Box, Typography, IconButton, Button } from "@mui/material";
import { Close, FlightTakeoff } from "@mui/icons-material";

import { Divider } from "components";
import { renderActions, CameraType, selectStamp, StampKind } from "features/render";
import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";

export function LogPointStamp() {
    const {
        state: { view_OLD: view },
    } = useExplorerGlobals();
    const dispatch = useAppDispatch();
    const stamp = useAppSelector(selectStamp);

    if (stamp?.kind !== StampKind.LogPoint) {
        return null;
    }

    return (
        <Box px={2} pb={1} sx={{ pointerEvents: "auto" }}>
            <Box display="flex" alignItems={"center"} justifyContent={"space-between"}>
                <Typography fontWeight={600}>
                    {stamp.data.logPoint.name ?? stamp.data.logPoint.type ?? "Log point"}
                </Typography>
                <IconButton size="small" onClick={() => dispatch(renderActions.setStamp(null))}>
                    <Close />
                </IconButton>
            </Box>
            <Divider />
            Number: {stamp.data.logPoint.sequenceId} <br />
            Code: {stamp.data.logPoint.code} <br />
            Uploaded: {new Date(stamp.data.logPoint.timestampMs).toLocaleString()}
            <Box mt={1}>
                <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() =>
                        dispatch(
                            renderActions.setCamera({
                                type: CameraType.Flight,
                                goTo: {
                                    position: [stamp.data.logPoint.x, stamp.data.logPoint.y, stamp.data.logPoint.z],
                                    rotation: view ? quat.clone(view.camera.rotation) : [0, 0, 0, 1],
                                },
                            })
                        )
                    }
                >
                    <FlightTakeoff sx={{ mr: 2 }} />
                    Fly to point
                </Button>
            </Box>
        </Box>
    );
}
