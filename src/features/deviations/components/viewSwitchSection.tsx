import { Box, FormControlLabel } from "@mui/material";
import { FollowParametricObject } from "@novorender/api";
import { useEffect, useMemo, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { IosSwitch } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { getCameraDir } from "features/engine2D/utils";
import { followPathActions, selectView2d } from "features/followPath";
import { useGoToProfile } from "features/followPath/useGoToProfile";
import { getTopDownParams, selectDefaultTopDownElevation, selectTopDownSnapToAxis } from "features/orthoCam";
import { CameraType, renderActions, selectCamera, selectCameraType } from "features/render";
import { AsyncState, AsyncStatus } from "types/misc";

import { selectSelectedCenterLineId, selectSelectedProfile } from "../deviationsSlice";

export function ViewSwitchSection() {
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const dispatch = useAppDispatch();
    const view2d = useAppSelector(selectView2d);
    const goToProfile = useGoToProfile();
    const selectedProfile = useAppSelector(selectSelectedProfile);
    const selectedCenterLineId = useAppSelector(selectSelectedCenterLineId);
    const selectedCenterLine =
        selectedProfile && selectedCenterLineId
            ? selectedProfile.subprofiles.find((sp) => sp.centerLine?.brepId === selectedCenterLineId)?.centerLine
            : undefined;
    const followPathId = selectedCenterLine?.objectId;
    const [fpObj, setFpObj] = useState<AsyncState<FollowParametricObject | undefined>>({ status: AsyncStatus.Initial });
    const defaultTopDownElevation = useAppSelector(selectDefaultTopDownElevation);
    const snapToNearestAxis = useAppSelector(selectTopDownSnapToAxis) === undefined;
    const camera = useAppSelector(selectCamera);
    const cameraType = useAppSelector(selectCameraType);

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

    const isLookingDown = useMemo(() => {
        if (!camera.goTo || cameraType !== CameraType.Orthographic) {
            return false;
        }
        const dir = getCameraDir(camera.goTo.rotation);
        const z = dir[2];
        return Math.abs(z) >= 0.999;
    }, [camera, cameraType]);

    const handleCrossSectionChange = () => {
        if (fpObj.status !== AsyncStatus.Success || !fpObj.data || !selectedCenterLine) {
            return;
        }

        const newState = !view2d || isLookingDown;

        dispatch(followPathActions.setView2d(newState));
        goToProfile({
            fpObj: fpObj.data,
            p: Number(selectedCenterLine.parameterBounds[0]),
            newView2d: newState,
            keepOffset: false,
        });
    };

    const handleTopDownChange = () => {
        if (!view2d || !isLookingDown) {
            dispatch(followPathActions.setView2d(true));
            dispatch(
                renderActions.setCamera({
                    type: CameraType.Orthographic,
                    goTo: getTopDownParams({ view, elevation: defaultTopDownElevation, snapToNearestAxis }),
                })
            );
        } else {
            dispatch(followPathActions.setView2d(false));
            dispatch(renderActions.setCamera({ type: CameraType.Pinhole }));
        }

        // if (fpObj.status !== AsyncStatus.Success || !fpObj.data || !selectedCenterLine) {
        //     return;
        // }

        // const newState = !view2d || !isLookingDown;

        // dispatch(followPathActions.setView2d(newState));
        // goToProfile({
        //     fpObj: fpObj.data,
        //     p: Number(selectedCenterLine.parameterBounds[0]),
        //     newView2d: newState,
        //     keepOffset: false,
        //     dir: [0, 0, 1],
        //     snapToAxis: snapToNearestAxis ? view.renderState.camera.rotation : undefined,
        // });
    };

    const isCrossSection = view2d && !isLookingDown;
    const isTopDown = view2d && isLookingDown;

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
                        />
                    }
                    label={<Box>Cross section</Box>}
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
