import { css } from "@emotion/react";
import { Box, Button, Slider, styled, Typography } from "@mui/material";
import { DuoMeasurementValues } from "@novorender/api";
import { ReadonlyVec2 } from "gl-matrix";
import { forwardRef, memo, SyntheticEvent, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectRightmost2dDeviationCoordinate } from "features/deviations";
import { GroupsAndColorsHud } from "features/deviations/components/groupsAndColorsHud";
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
    const followPathId = useAppSelector(selectSelectedPath);
    const isView2d = useAppSelector(selectView2d);
    const lastPt = useRef<ReadonlyVec2>();
    const [centerLinePt, setCenterLinePt] = useState<ReadonlyVec2>();

    const containerRef = useRef<HTMLDivElement | null>(null);

    const isFindingPoint = useRef(false);
    const findPoint = useCallback(
        async function findPoint() {
            if (!view?.measure || !followPathId || isFindingPoint.current) {
                setCenterLinePt(undefined);
                return;
            }

            isFindingPoint.current = true;
            const segment = await view.measure.core.pickCurveSegment(followPathId);
            if (segment) {
                const measure = await view.measure.core.measure(segment, {
                    drawKind: "vertex",
                    ObjectId: -1,
                    parameter: view.renderState.camera.position,
                });
                if (measure) {
                    const duoMeasure = measure as DuoMeasurementValues;
                    if (duoMeasure.measureInfoB && typeof duoMeasure.measureInfoB.parameter === "number") {
                        const pt3d = duoMeasure.measureInfoB.point;
                        if (pt3d) {
                            const pt = view.measure.draw.toMarkerPoints([pt3d])[0];
                            setCenterLinePt(pt);
                        }
                    }
                }
            }
            isFindingPoint.current = false;
        },
        [view?.measure, view?.renderState.camera, followPathId]
    );

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

                findPoint();
            },
        }),
        [view?.measure, currentProfileCenter, findPoint]
    );

    useEffect(() => {
        findPoint();

        async function findPoint() {
            if (!view?.measure || !followPathId) {
                setCenterLinePt(undefined);
                return;
            }

            const segment = await view.measure.core.pickCurveSegment(followPathId);
            if (segment) {
                const measure = await view.measure.core.measure(segment, {
                    drawKind: "vertex",
                    ObjectId: -1,
                    parameter: view.renderState.camera.position,
                });
                if (measure) {
                    const duoMeasure = measure as DuoMeasurementValues;
                    if (duoMeasure.measureInfoB && typeof duoMeasure.measureInfoB.parameter === "number") {
                        const pt3d = duoMeasure.measureInfoB.point;
                        if (pt3d) {
                            const pt = view.measure.draw.toMarkerPoints([pt3d])[0];
                            setCenterLinePt(pt);
                        }
                    }
                }
            }
        }
    }, [view?.measure, view?.renderState.camera, followPathId]);

    if (isView2d) {
        if (!view?.measure || !currentProfileCenter || viewMode !== ViewMode.FollowPath) {
            return null;
        }

        const pt = view.measure.draw.toMarkerPoints([currentProfileCenter])[0]! || lastPt.current;

        if (!pt) {
            return null;
        }

        lastPt.current = pt;

        let legendOffset = 160;
        if (rightmost2dDeviationCoordinate) {
            legendOffset = Math.max(legendOffset, rightmost2dDeviationCoordinate - pt[0] + 50);
        }

        return (
            <div
                style={{
                    left: `${pt[0]}px`,
                    top: `${pt[1]}px`,
                    position: "absolute",
                }}
                ref={containerRef}
            >
                <div
                    style={{
                        position: "absolute",
                        transform: `translate(-100px, -180px)`,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        width: "200px",
                    }}
                >
                    <FollowPathControls />
                </div>

                <div
                    style={{
                        position: "absolute",
                        transform: `translate(${legendOffset}px, 0px)`,
                        width: "200px",
                        bottom: 0,
                    }}
                >
                    <GroupsAndColorsHud />
                </div>
            </div>
        );
    } else if (centerLinePt) {
        return (
            <LegendAlongCenterLine
                style={{
                    transform: `translate(${centerLinePt[0]}px, ${centerLinePt[1]}px)`,
                }}
            >
                <GroupsAndColorsHud />
            </LegendAlongCenterLine>
        );
    }
});

const LegendAlongCenterLine = styled("div")(
    ({ theme }) => css`
        position: absolute;
        max-width: 300px;
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
        <>
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

            <Typography mt={2}>Clipping: {clipping} m</Typography>
            <Box mx={2} width="100%">
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
        </>
    );
});
