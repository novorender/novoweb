import { Box, FormControlLabel } from "@mui/material";
import { FollowParametricObject, rotationFromDirection } from "@novorender/api";
import { vec3 } from "gl-matrix";
import { useEffect, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { IosSwitch } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { followPathActions, selectCurrentCenter, selectProfile, selectView2d } from "features/followPath";
import { useGoToProfile } from "features/followPath/useGoToProfile";
import { getTopDownParams, selectDefaultTopDownElevation, selectTopDownSnapToAxis } from "features/orthoCam";
import { CameraType, renderActions } from "features/render";
import { AsyncState, AsyncStatus, ViewMode } from "types/misc";

import { selectSelectedCenterLineId, selectSelectedProfile } from "../deviationsSlice";
import { useIsTopDownOrthoCamera } from "../hooks/useIsTopDownOrthoCamera";

export function ViewSwitchSection() {
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const dispatch = useAppDispatch();
    const view2d = useAppSelector(selectView2d);
    const goToProfile = useGoToProfile();
    const selectedProfile = useAppSelector(selectSelectedProfile);
    const profilePos = useAppSelector(selectProfile);
    const currentCenter = useAppSelector(selectCurrentCenter);
    const selectedCenterLineId = useAppSelector(selectSelectedCenterLineId);
    const selectedCenterLine =
        selectedProfile && selectedCenterLineId
            ? selectedProfile.subprofiles.find((sp) => sp.centerLine?.brepId === selectedCenterLineId)?.centerLine
            : undefined;
    const followPathId = selectedCenterLine?.objectId;
    const [fpObj, setFpObj] = useState<AsyncState<FollowParametricObject | undefined>>({ status: AsyncStatus.Initial });
    const defaultTopDownElevation = useAppSelector(selectDefaultTopDownElevation);
    const snapToNearestAxis = useAppSelector(selectTopDownSnapToAxis) === undefined;

    useEffect(() => {
        findFpObj();

        async function findFpObj() {
            if (!view?.measure || !followPathId) {
                return;
            }

            setFpObj({ status: AsyncStatus.Loading });
            try {
                const fp = await view.measure?.followPath.followParametricObjects([followPathId], {
                    cylinderMeasure: "center",
                });
                setFpObj({ status: AsyncStatus.Success, data: fp });
            } catch (ex) {
                console.warn(ex);
                setFpObj({ status: AsyncStatus.Error, msg: "Error following parameter object" });
            }
        }
    }, [view, followPathId]);

    const isTopDownOrthoCamera = useIsTopDownOrthoCamera();

    const handleCrossSectionChange = () => {
        if (fpObj.status !== AsyncStatus.Success || !fpObj.data || !selectedCenterLine) {
            return;
        }

        const newState = !view2d || isTopDownOrthoCamera;

        const pos = Math.max(
            selectedCenterLine.parameterBounds[0],
            Math.min(selectedCenterLine.parameterBounds[1], Number(profilePos))
        );

        dispatch(followPathActions.setView2d(newState));
        dispatch(renderActions.setViewMode(newState ? ViewMode.FollowPath : ViewMode.Default));
        goToProfile({
            fpObj: fpObj.data,
            p: pos,
            newView2d: newState,
            keepOffset: false,
        });
    };

    const handleTopDownChange = () => {
        dispatch(followPathActions.setView2d(false));
        dispatch(renderActions.setGrid({ enabled: false }));
        dispatch(renderActions.setClippingPlanes({ enabled: false, planes: [] }));
        dispatch(followPathActions.setCurrentCenter(undefined));
        dispatch(followPathActions.setPtHeight(undefined));

        if (!isTopDownOrthoCamera) {
            if (currentCenter) {
                const position = vec3.clone(currentCenter);
                position[2] += 40;
                dispatch(
                    renderActions.setCamera({
                        type: CameraType.Orthographic,
                        goTo: {
                            position,
                            rotation: rotationFromDirection(
                                [0, 0, 1],
                                snapToNearestAxis ? view.renderState.camera.rotation : undefined
                            ),
                            fov: 100,
                        },
                    })
                );
            } else {
                dispatch(
                    renderActions.setCamera({
                        type: CameraType.Orthographic,
                        goTo: getTopDownParams({ view, elevation: defaultTopDownElevation, snapToNearestAxis }),
                    })
                );
            }
        } else {
            dispatch(renderActions.setCamera({ type: CameraType.Pinhole }));
        }
    };

    const isCrossSection = view2d && !isTopDownOrthoCamera;
    const isTopDown = isTopDownOrthoCamera;

    return (
        <>
            <Box>
                <FormControlLabel
                    control={
                        <IosSwitch
                            size="medium"
                            color="primary"
                            checked={isCrossSection}
                            onChange={handleCrossSectionChange}
                            disabled={!selectedCenterLine}
                        />
                    }
                    label={<Box>Follow path</Box>}
                />
            </Box>
            <Box>
                <FormControlLabel
                    control={
                        <IosSwitch size="medium" color="primary" checked={isTopDown} onChange={handleTopDownChange} />
                    }
                    label={<Box>Top-down</Box>}
                />
            </Box>
        </>
    );
}
