import { GpsFixed } from "@mui/icons-material";
import { Box, IconButton, SvgIcon, useTheme } from "@mui/material";
import { decomposeRotation } from "@novorender/api/web_app/controller/orientation";
import { memo, ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { HudPanel } from "components/hudPanel";
import IconButtonExt from "components/iconButtonExt";
import { useCameraState } from "contexts/cameraState";
import { LocationStatus, selectLocationStatus } from "features/myLocation/myLocationSlice";
import { useGoToMyLocation } from "features/myLocation/useGoToMyLocation";
import { selectIsTopDown } from "features/orthoCam";
import { CameraType, renderActions, selectCamera, selectNavigationCube } from "features/render";
import { tmToLatLon } from "features/render/utils";
import { explorerActions, selectTmZoneForCalc } from "slices/explorer";
import { formatLength } from "utils/misc";

export default memo(function LocationHudInner() {
    return (
        <Box sx={{ position: "absolute", top: 0, left: 0, zIndex: 1050 }}>
            <Box display="flex" gap={2}>
                <CompassBtn />
                <MyLocationBtn />
                <CameraCoordinates />
                <Scale />
            </Box>
        </Box>
    );
});

function CompassBtn() {
    const cameraState = useCameraState();

    const theme = useTheme();
    const navigationCube = useAppSelector(selectNavigationCube);
    const dispatch = useAppDispatch();

    const rotation = useMemo(() => {
        if (!cameraState) {
            return 0;
        }

        const { yaw } = decomposeRotation(cameraState.rotation);
        return yaw;
    }, [cameraState]);

    return (
        <HudPanel sx={{ pointerEvents: "auto" }}>
            <IconButton
                onClick={() => {
                    dispatch(renderActions.setNavigationCube({ enabled: !navigationCube.enabled }));
                }}
                sx={navigationCube.enabled ? { outline: `3px solid ${theme.palette.primary.main}` } : {}}
            >
                <SvgIcon>
                    <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ rotate: `${rotation}rad` }}
                    >
                        <path d="M 12 1 l -6 10 l 1 1 l 5 -2 l 5 2 l 1 -1 z" fill={theme.palette.primary.main} />
                        <path d="M 12 23 l 6 -10 l -1 -1 l -5 2 l -5 -2 l -1 1 z" />
                    </svg>
                </SvgIcon>
            </IconButton>
        </HudPanel>
    );
}

function MyLocationBtn() {
    const goToMyLocation = useGoToMyLocation();
    const status = useAppSelector(selectLocationStatus);
    const loading = status.status === LocationStatus.Loading;
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>();
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (status.status === LocationStatus.Error) {
            dispatch(explorerActions.setSnackbarMessage({ msg: status.msg }));
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                dispatch(explorerActions.setSnackbarMessage(null));
                timeoutRef.current = undefined;
            }, 3000);
        }
    }, [dispatch, status]);

    return (
        <HudPanel sx={{ pointerEvents: "auto" }}>
            <IconButtonExt onClick={goToMyLocation} disabled={loading} loading={loading}>
                <GpsFixed />
            </IconButtonExt>
        </HudPanel>
    );
}

function CameraCoordinates() {
    const cameraState = useCameraState();
    const tmZone = useAppSelector(selectTmZoneForCalc);
    const [showXyz, setShowXyz] = useState(false);

    if (!cameraState) {
        return null;
    }

    const cameraPos = cameraState.position;

    let content: ReactNode;
    if (tmZone && !showXyz) {
        const coords = tmToLatLon({ coords: cameraPos, tmZone });

        content = (
            <>
                <Box>Lon</Box>
                <Box ml={1}>{coords.longitude.toFixed(5)}</Box>
                <Box ml={2}>Lat</Box>
                <Box ml={1}>{coords.latitude.toFixed(5)}</Box>
                <Box ml={2}>Alt</Box>
                <Box ml={1}>{cameraPos[2].toFixed(0)}m</Box>
            </>
        );
    } else {
        content = (
            <>
                <Box>X</Box>
                <Box ml={1}>{cameraPos[0].toFixed(3)}</Box>
                <Box ml={2}>Y</Box>
                <Box ml={1}>{cameraPos[1].toFixed(3)}</Box>
                <Box ml={2}>Z</Box>
                <Box ml={1}>{cameraPos[2].toFixed(3)}</Box>
            </>
        );
    }

    return (
        <HudPanel
            sx={{ pointerEvents: "auto", cursor: tmZone ? "pointer" : undefined }}
            onClick={() => setShowXyz(!showXyz)}
        >
            <Box display="flex" p={1}>
                {content}
            </Box>
        </HudPanel>
    );
}

function Scale() {
    const cameraState = useCameraState();
    const theme = useTheme();
    const isTopDown = useAppSelector(selectIsTopDown);
    const camera = useAppSelector(selectCamera);

    const scale = useMemo(() => {
        if (!cameraState || !camera || camera.type !== CameraType.Orthographic) {
            return;
        }

        const fov = cameraState.fov;
        const height = window.innerHeight;
        const pxPerM = height / fov;
        const width = getNiceScaleMeters(pxPerM);
        return { width, px: Math.round(width * pxPerM) };
    }, [cameraState, camera]);

    if (!scale || !isTopDown) {
        return null;
    }

    return (
        <HudPanel sx={{ px: 2, width: scale.px, position: "relative" }}>
            <Box textAlign="center" width="100%" p={1}>
                {formatLength(scale.width)}
            </Box>
            <Box position="relative">
                <Box
                    width="100%"
                    height="8px"
                    position="absolute"
                    bottom={theme.spacing(1)}
                    sx={{ border: "1px solid black", borderTop: 0 }}
                ></Box>
            </Box>
        </HudPanel>
    );
}

function getNiceScaleMeters(pxPerM: number) {
    const desiredWidthPx = 150;
    const m = desiredWidthPx / pxPerM;
    let roundTo;
    if (m >= 100) {
        roundTo = 10;
    } else if (m >= 1) {
        roundTo = 1;
    } else if (m >= 0.1) {
        roundTo = 0.1;
    } else {
        roundTo = 0.01;
    }
    return Math.round(m / roundTo) * roundTo;
}
