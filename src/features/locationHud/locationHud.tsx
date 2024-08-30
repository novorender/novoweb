import { GpsFixed } from "@mui/icons-material";
import { Box, IconButton, SvgIcon, Tooltip, useTheme } from "@mui/material";
import { decomposeRotation } from "@novorender/api/web_app/controller/orientation";
import { memo, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { HudPanel } from "components/hudPanel";
import IconButtonExt from "components/iconButtonExt";
import { useCameraState } from "contexts/cameraState";
import { useLastPickSample } from "contexts/lastPickSample";
import { LocationStatus, selectLocationStatus } from "features/myLocation/myLocationSlice";
import { useGoToMyLocation } from "features/myLocation/useGoToMyLocation";
import { selectIsTopDown } from "features/orthoCam";
import { CameraType, renderActions, selectCamera, selectNavigationCube } from "features/render";
import { tm2LatLon } from "features/render/utils";
import { explorerActions, selectTmZoneForCalc } from "slices/explorer";
import { formatLength } from "utils/misc";

export default memo(function LocationHudInner() {
    return (
        <Box sx={{ position: "absolute", top: 0, left: 0, zIndex: 1050 }}>
            <Box display="flex" gap={2}>
                <CompassBtn />
                <MyLocationBtn />
                <CursorCoordinates />
                <Scale />
            </Box>
        </Box>
    );
});

function CompassBtn() {
    const cameraState = useCameraState();

    const theme = useTheme();
    const { t } = useTranslation();
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
            <Tooltip title={t("navigationCube")} placement="bottom">
                <Box>
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
                                <path
                                    d="M 12 1 l -6 10 l 1 1 l 5 -2 l 5 2 l 1 -1 z"
                                    fill={theme.palette.primary.main}
                                />
                                <path d="M 12 23 l 6 -10 l -1 -1 l -5 2 l -5 -2 l -1 1 z" />
                            </svg>
                        </SvgIcon>
                    </IconButton>
                </Box>
            </Tooltip>
        </HudPanel>
    );
}

function MyLocationBtn() {
    const goToMyLocation = useGoToMyLocation();
    const status = useAppSelector(selectLocationStatus);
    const loading = status.status === LocationStatus.Loading;
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();

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
            <Tooltip title={t("myLocation")} placement="bottom">
                <Box>
                    <IconButtonExt onClick={goToMyLocation} disabled={loading} loading={loading}>
                        <GpsFixed />
                    </IconButtonExt>
                </Box>
            </Tooltip>
        </HudPanel>
    );
}

function CursorCoordinates() {
    const position = useLastPickSample()?.position;
    const tmZone = useAppSelector(selectTmZoneForCalc);
    const [showXyz, setShowXyz] = useState(false);
    const { t } = useTranslation();

    let content: ReactNode;
    if (tmZone && !showXyz) {
        let lon = "-",
            lat = "-",
            alt = "-";

        try {
            if (position) {
                const coords = tm2LatLon({ coords: position, tmZone });
                lon = coords.longitude.toFixed(5);
                lat = coords.latitude.toFixed(5);
                alt = position[2].toFixed(0) + "m";
            }

            content = (
                <>
                    <Box>{t("longitudeShort")}</Box>
                    <Box ml={1} minWidth="70px">
                        {lon}
                    </Box>
                    <Box ml={2}>{t("latitudeShort")}</Box>
                    <Box ml={1} minWidth="70px">
                        {lat}
                    </Box>
                    <Box ml={2}>{t("altitudeShort")}</Box>
                    <Box ml={1} minWidth="50px">
                        {alt}
                    </Box>
                </>
            );
        } catch (ex) {
            console.warn(ex);
            setShowXyz(true);
        }
    }

    if (!content) {
        content = (
            <>
                <Box>X</Box>
                <Box ml={1} minWidth="100px">
                    {position?.[0].toFixed(3) ?? "-"}
                </Box>
                <Box ml={2}>Y</Box>
                <Box ml={1} minWidth="100px">
                    {position?.[1].toFixed(3) ?? "-"}
                </Box>
                <Box ml={2}>Z</Box>
                <Box ml={1} minWidth="60px">
                    {position?.[2].toFixed(3) ?? "-"}
                </Box>
            </>
        );
    }

    return (
        <HudPanel
            sx={{ pointerEvents: "auto", cursor: tmZone ? "pointer" : undefined }}
            onClick={() => setShowXyz(!showXyz)}
        >
            <Tooltip title={t("coordinates")} placement="bottom">
                <Box display="flex" p={1}>
                    {content}
                </Box>
            </Tooltip>
        </HudPanel>
    );
}

function Scale() {
    const cameraState = useCameraState();
    const theme = useTheme();
    const isTopDown = useAppSelector(selectIsTopDown);
    const camera = useAppSelector(selectCamera);
    const { t } = useTranslation();

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
        <HudPanel sx={{ pointerEvents: "auto", px: 2, width: scale.px, position: "relative" }}>
            <Tooltip title={t("scale")} placement="bottom">
                <Box textAlign="center" width="100%" p={1}>
                    {formatLength(scale.width)}
                </Box>
            </Tooltip>
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
    } else if (m >= 0.01) {
        roundTo = 0.01;
    } else if (m >= 0.001) {
        roundTo = 0.001;
    } else {
        return m;
    }
    return Math.round(m / roundTo) * roundTo;
}
