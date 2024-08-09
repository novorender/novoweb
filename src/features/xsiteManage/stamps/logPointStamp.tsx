import { Close, FlightTakeoff } from "@mui/icons-material";
import { Box, Button, IconButton, Typography } from "@mui/material";
import { quat } from "gl-matrix";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { CameraType, renderActions, selectStamp, StampKind } from "features/render";

export function LogPointStamp() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const { t } = useTranslation();
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
            {t("number:")}
            {stamp.data.logPoint.sequenceId} <br />
            {t("code:")}
            {stamp.data.logPoint.code} <br />
            {t("uploaded:")}
            {new Date(stamp.data.logPoint.timestampMs).toLocaleString()}
            <Box mt={1}>
                <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() =>
                        dispatch(
                            renderActions.setCamera({
                                type: CameraType.Pinhole,
                                goTo: {
                                    position: [stamp.data.logPoint.x, stamp.data.logPoint.y, stamp.data.logPoint.z],
                                    rotation: view ? quat.clone(view.renderState.camera.rotation) : [0, 0, 0, 1],
                                },
                            }),
                        )
                    }
                >
                    <FlightTakeoff sx={{ mr: 2 }} />
                    {t("flyToPoint")}
                </Button>
            </Box>
        </Box>
    );
}
