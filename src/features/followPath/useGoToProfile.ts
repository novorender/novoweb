import { FollowParametricObject, rotationFromDirection } from "@novorender/api";
import { glMatrix, mat3, quat, vec3 } from "gl-matrix";
import { useCallback } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { CameraType, renderActions } from "features/render";

import {
    followPathActions,
    selectAutoRecenter,
    selectClipping,
    selectCurrentCenter,
    selectShowGrid,
    selectVerticalClipping,
    selectView2d,
} from "./followPathSlice";

export function useGoToProfile() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const dispatch = useAppDispatch();

    const verticalClipping = useAppSelector(selectVerticalClipping);
    const currentCenter = useAppSelector(selectCurrentCenter);
    const clipping = useAppSelector(selectClipping);
    const view2d = useAppSelector(selectView2d);
    const showGrid = useAppSelector(selectShowGrid);
    const autoRecenter = useAppSelector(selectAutoRecenter);

    const goToProfile = useCallback(
        async ({
            keepOffset,
            p,
            newView2d,
            keepCamera,
            clipVertical,
            fpObj,
            lookAtP,
        }: {
            p: number;
            newView2d?: boolean;
            keepOffset?: boolean;
            keepCamera?: boolean;
            clipVertical?: boolean;
            fpObj: FollowParametricObject;
            // instead of setting position to `p` - set camera slight behind and above and look at `p`
            lookAtP?: boolean;
        }) => {
            const measureView = view?.measure;
            if (!measureView) {
                return;
            }
            const pos = await measureView.followPath.getCameraValues(p, fpObj);
            if (!pos) {
                return;
            }

            const useKeepOffset = keepOffset != undefined ? keepOffset : !autoRecenter;

            const { position: pt, normal: dir } = pos;

            const followPlane = view.renderState.clipping.planes.length
                ? view.renderState.clipping.planes[0].normalOffset
                : undefined;
            const offset = vec3.fromValues(0, 0, 0);
            if (useKeepOffset && currentCenter) {
                if ((newView2d ?? view2d) && followPlane) {
                    const pointVector = vec3.subtract(vec3.create(), view.renderState.camera.position, pt);
                    const d = vec3.dot(pointVector, dir);
                    const planePos = vec3.scaleAndAdd(vec3.create(), view.renderState.camera.position, dir, -d);
                    vec3.sub(offset, pt, planePos);
                } else {
                    vec3.sub(offset, currentCenter, view.renderState.camera.position);
                }
            } else if (!useKeepOffset && lookAtP && !(newView2d || view2d)) {
                vec3.scaleAndAdd(offset, offset, dir, -20);
                vec3.add(offset, offset, vec3.fromValues(0, 0, -10));
            }
            const offsetPt = vec3.sub(vec3.create(), pt, offset);
            let rotation = quat.create();
            if (clipVertical ?? verticalClipping) {
                const up = glMatrix.equals(Math.abs(vec3.dot(vec3.fromValues(0, 0, 1), dir)), 1)
                    ? vec3.fromValues(0, 1, 0)
                    : vec3.fromValues(0, 0, 1);

                const right = vec3.cross(vec3.create(), up, dir);
                vec3.normalize(right, right);

                const newDir = vec3.cross(vec3.create(), up, right);
                vec3.normalize(newDir, newDir);
                if (vec3.dot(newDir, dir) < 0) {
                    vec3.negate(dir, newDir);
                } else {
                    vec3.copy(dir, newDir);
                }

                rotation = quat.fromMat3(
                    quat.create(),
                    mat3.fromValues(right[0], right[1], right[2], up[0], up[1], up[2], dir[0], dir[1], dir[2])
                );
            } else if (!useKeepOffset && lookAtP && !(newView2d || view2d)) {
                const lookAtProfileDir = vec3.sub(vec3.create(), offsetPt, pt);
                vec3.normalize(lookAtProfileDir, lookAtProfileDir);
                rotation = rotationFromDirection(lookAtProfileDir);
            } else {
                rotation = rotationFromDirection(dir);
            }

            if (newView2d ?? view2d) {
                dispatch(
                    renderActions.setCamera({
                        type: CameraType.Orthographic,
                        goTo: {
                            rotation,
                            position: offsetPt,
                            fov: Math.min(60, view.renderState.camera.fov),
                            far: clipping + 0.02,
                        },
                        gridOrigo: pt as vec3,
                    })
                );

                dispatch(
                    renderActions.setGrid({
                        enabled: showGrid,
                    })
                );
            } else {
                dispatch(renderActions.setGrid({ enabled: false }));

                if (!keepCamera) {
                    dispatch(
                        renderActions.setCamera({
                            type: CameraType.Pinhole,
                            goTo: {
                                position: offsetPt,
                                rotation: useKeepOffset ? ([...view.renderState.camera.rotation] as Vec4) : rotation,
                            },
                        })
                    );
                }
            }

            const w = vec3.dot(dir, pt);
            dispatch(
                renderActions.setClippingPlanes({
                    enabled: true,
                    planes: [{ normalOffset: [dir[0], dir[1], dir[2], w], baseW: w, color: [0, 1, 0, 0.2] }],
                })
            );
            dispatch(followPathActions.setCurrentCenter(pt as Vec3));
            dispatch(followPathActions.setPtHeight(pt[2]));
        },
        [verticalClipping, currentCenter, clipping, view2d, showGrid, dispatch, view, autoRecenter]
    );

    return goToProfile;
}
