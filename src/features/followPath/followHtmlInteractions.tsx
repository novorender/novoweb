import { Box, Button, Slider, Typography } from "@mui/material";
import { ReadonlyVec2 } from "gl-matrix";
import { forwardRef, memo, SyntheticEvent, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectRightmost2dDeviationCoordinate } from "features/deviations";
import { GroupsAndColorsHud } from "features/deviations/components/groupsAndColorsHud";
import { getCameraDir } from "features/engine2D/utils";
import { CameraType, selectCamera, selectCameraType, selectViewMode } from "features/render";
import { AsyncStatus, ViewMode } from "types/misc";

import {
    followPathActions,
    selectAutoStepSize,
    selectClipping,
    selectCurrentCenter,
    selectFollowObject,
    selectProfile,
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
    const cameraType = useAppSelector(selectCameraType);
    const camera = useAppSelector(selectCamera);
    const lastPt = useRef<ReadonlyVec2>();

    const containerRef = useRef<HTMLDivElement | null>(null);

    useImperativeHandle(
        ref,
        () => ({
            update: () => {
                if (!view?.measure || !currentProfileCenter || !containerRef.current) {
                    return;
                }

                const pt = view.measure.draw.toMarkerPoints([currentProfileCenter])[0]!;
                if (pt) {
                    containerRef.current.style.left = `${pt[0]}px`;
                    containerRef.current.style.top = `${pt[1]}px`;
                }
            },
        }),
        [view?.measure, currentProfileCenter]
    );

    const isLookingDown = useMemo(() => {
        if (!camera.goTo || cameraType !== CameraType.Orthographic) {
            return false;
        }
        const dir = getCameraDir(camera.goTo.rotation);
        const z = dir[2];
        return Math.abs(z) >= 0.999;
    }, [camera, cameraType]);

    if (
        !view?.measure ||
        !currentProfileCenter ||
        viewMode !== ViewMode.FollowPath ||
        cameraType !== CameraType.Orthographic
    ) {
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
            {!isLookingDown && (
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
            )}

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
});

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
