import { css } from "@emotion/react";
import { Box, Button, Slider, styled } from "@mui/material";
import { ReadonlyVec2, vec2 } from "gl-matrix";
import { forwardRef, memo, SyntheticEvent, useEffect, useImperativeHandle, useRef, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { areArraysEqual } from "features/arcgis/utils";
import {
    selectClosestToCenterFollowPathPoint,
    selectIsLegendFloating,
    selectRightmost2dDeviationCoordinate,
} from "features/deviations";
import { GroupsAndColorsHud } from "features/deviations/components/groupsAndColorsHud";
import { useIsTopDownOrthoCamera } from "features/deviations/hooks/useIsTopDownOrthoCamera";
import { CameraType, selectBackground, selectCameraType } from "features/render";
import { selectViewMode } from "features/render";
import { AsyncStatus, ViewMode } from "types/misc";

import {
    followPathActions,
    selectAutoStepSize,
    selectClipping,
    selectCurrentCenter,
    selectFollowObject,
    selectProfile,
    selectSelectedPath,
    selectView2d,
} from "./followPathSlice";
import { useFollowPathFromIds } from "./useFollowPathFromIds";
import { useGoToProfile } from "./useGoToProfile";

export const FollowHtmlInteractions = forwardRef(function FollowHtmlInteractions(_props, ref) {
    const {
        state: { view },
    } = useExplorerGlobals();
    const currentProfileCenter = useAppSelector(selectCurrentCenter);
    const viewMode = useAppSelector(selectViewMode);
    const rightmost2dDeviationCoordinate = useAppSelector(selectRightmost2dDeviationCoordinate);
    const lastRightmost2dDeviationCorrdinate = useRef(rightmost2dDeviationCoordinate);
    const isView2d = useAppSelector(selectView2d);
    const cameraType = useAppSelector(selectCameraType);
    const isTopDownOrtho = useIsTopDownOrthoCamera();
    const isCrossSectionView = isView2d && cameraType === CameraType.Orthographic && !isTopDownOrtho;
    const isLegendFloating = useAppSelector(selectIsLegendFloating);
    const lastPt = useRef<ReadonlyVec2>();
    const bgColor = useAppSelector(selectBackground);
    const isBlackBg = bgColor && areArraysEqual(bgColor.color, [0, 0, 0, 1]);
    const legendOffset = useRef(160);
    const lastFov = useRef<number>();
    const followPath = useAppSelector(selectSelectedPath);
    const isActive = viewMode === ViewMode.FollowPath || viewMode === ViewMode.Deviations;
    const centerLinePt = useAppSelector(selectClosestToCenterFollowPathPoint);
    const prevCenterLinePt = useRef(centerLinePt);
    const pinholeQuadrant = useRef([-1, -1]);

    const containerRef = useRef<HTMLDivElement | null>(null);

    useImperativeHandle(
        ref,
        () => ({
            update: () => {
                if (!view?.measure) {
                    return;
                }

                if (currentProfileCenter && containerRef.current) {
                    const pt = view.measure.draw.toMarkerPoints([currentProfileCenter])[0];
                    if (pt) {
                        containerRef.current.style.left = `${pt[0]}px`;
                        containerRef.current.style.top = `${pt[1]}px`;
                    }
                }
            },
        }),
        [view?.measure, currentProfileCenter]
    );

    if (!isActive) {
        return;
    }

    if (isCrossSectionView) {
        if (!view?.measure || !currentProfileCenter) {
            return null;
        }

        const pt = view.measure.draw.toMarkerPoints([currentProfileCenter])[0]! || lastPt.current;

        if (!pt) {
            return null;
        }

        lastPt.current = pt;

        const fov = view.renderState.camera.fov;
        if (
            Number.isFinite(rightmost2dDeviationCoordinate) &&
            rightmost2dDeviationCoordinate !== lastRightmost2dDeviationCorrdinate.current
        ) {
            legendOffset.current = Math.max(160, rightmost2dDeviationCoordinate! - pt[0] + 50);
            lastRightmost2dDeviationCorrdinate.current = rightmost2dDeviationCoordinate!;
            lastFov.current = fov;
        }

        const k = (lastFov.current ?? fov) / fov;
        let scaledLegendOffset = legendOffset.current * k;
        if (scaledLegendOffset > 500) {
            scaledLegendOffset = 140;
        }

        return (
            <div
                style={{
                    left: `${pt[0]}px`,
                    top: `${pt[1]}px`,
                    position: "absolute",
                    color: isBlackBg ? "white" : undefined,
                    fontWeight: 600,
                }}
                ref={containerRef}
            >
                <div
                    style={{
                        position: "absolute",
                        transform: `translate(-100px, -80px)`,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        width: "200px",
                    }}
                >
                    <FollowPathControls />
                </div>

                {viewMode === ViewMode.Deviations && followPath && isLegendFloating && (
                    <div
                        style={{
                            position: "absolute",
                            transform: `translate(${scaledLegendOffset}px, 0px)`,
                            width: "400px",
                            bottom: 0,
                        }}
                    >
                        <GroupsAndColorsHud absPos />
                    </div>
                )}
            </div>
        );
    } else if (viewMode === ViewMode.Deviations && followPath && centerLinePt && isLegendFloating) {
        const center = vec2.fromValues(window.innerWidth / 2, window.innerHeight / 2);
        const tolerancePx = 20;

        for (const axis of [0, 1]) {
            const newAxisQuad = centerLinePt[axis] < center[axis] ? -1 : 1;
            if (newAxisQuad !== pinholeQuadrant.current[axis]) {
                const withinTolerance = Math.abs(centerLinePt[axis] - center[axis]) < tolerancePx;
                if (!withinTolerance) {
                    pinholeQuadrant.current[axis] = newAxisQuad;
                }
            }
        }

        prevCenterLinePt.current = centerLinePt;

        return (
            <LegendAlongCenterLine
                style={{
                    ...(pinholeQuadrant.current[0] === -1
                        ? { left: `${centerLinePt[0]}px` }
                        : { right: `${window.innerWidth - centerLinePt[0]}px` }),
                    ...(pinholeQuadrant.current[1] === -1
                        ? { top: `${centerLinePt[1]}px` }
                        : { bottom: `${window.innerHeight - centerLinePt[1]}px` }),
                }}
            >
                <GroupsAndColorsHud absPos={false} />
            </LegendAlongCenterLine>
        );
    }
});

const LegendAlongCenterLine = styled("div")(
    ({ theme }) => css`
        position: absolute;
        max-width: 400px;
        padding: 1rem;
        margin: 1rem;
        border-radius: ${theme.shape.borderRadius}px;
        background: ${theme.palette.background.paper};
    `
);

const FollowPathControls = memo(function FollowPathControls() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const dispatch = useAppDispatch();
    const autoStepSize = useAppSelector(selectAutoStepSize);
    const following = useFollowPathFromIds();
    const goToProfile = useGoToProfile();
    const profile = useAppSelector(selectProfile);
    const followObject = useAppSelector(selectFollowObject);
    const _clipping = useAppSelector(selectClipping);

    const [clipping, setClipping] = useState(_clipping);

    useEffect(() => setClipping(_clipping), [_clipping]);

    if (!view) {
        return null;
    }

    const handleClippingChange = (_event: Event, newValue: number | number[]) => {
        if (Array.isArray(newValue)) {
            return;
        }

        setClipping(newValue);
        if (view.renderState.camera.kind === "orthographic") {
            view.modifyRenderState({ camera: { far: newValue } });
        }
    };

    const handleClippingCommit = (_event: Event | SyntheticEvent<Element, Event>, newValue: number | number[]) => {
        if (Array.isArray(newValue)) {
            return;
        }

        dispatch(followPathActions.setClipping(newValue));

        if (autoStepSize) {
            dispatch(followPathActions.setStep(String(newValue)));
        }
    };

    return (
        <Box position="absolute">
            <Box position="absolute" bottom="70px" sx={{ translate: "-50% 0" }}>
                <Button
                    variant="contained"
                    color="grey"
                    onClick={() => {
                        const fpObj =
                            followObject ?? (following.status === AsyncStatus.Success ? following.data : undefined);

                        if (fpObj) {
                            goToProfile({ fpObj, p: Number(profile), keepOffset: false });
                        }
                    }}
                >
                    Recenter
                </Button>
            </Box>

            <Box position="absolute" bottom="36px" whiteSpace="nowrap" textAlign="center" sx={{ translate: "-50% 0" }}>
                Clipping: {clipping} m
            </Box>
            <Box position="absolute" bottom="0px" width="200px" sx={{ translate: "-50% 0" }}>
                <Slider
                    getAriaLabel={() => "Clipping far"}
                    value={clipping}
                    min={0.001}
                    max={1}
                    step={0.01}
                    onChange={handleClippingChange}
                    onChangeCommitted={handleClippingCommit}
                    valueLabelDisplay="off"
                />
            </Box>
        </Box>
    );
});
