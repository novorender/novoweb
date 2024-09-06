import { View } from "@novorender/api";
import { ReadonlyVec2, ReadonlyVec3, vec2, vec3, vec4 } from "gl-matrix";
import { useCallback } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { getCameraDir } from "features/engine2D/utils";
import { getSnapToPlaneParams } from "features/orthoCam/utils";
import { CameraType, renderActions, RenderState, selectCameraType } from "features/render";

export function useClippingPlaneActions() {
    const dispatch = useAppDispatch();
    const cameraType = useAppSelector(selectCameraType);

    const snapToPlane = useCallback(
        (view: View, idx: number, anchorPos?: ReadonlyVec3) => {
            dispatch(
                renderActions.setCamera({
                    type: CameraType.Orthographic,
                    goTo: getSnapToPlaneParams({ planeIdx: idx, view, anchorPos }),
                }),
            );
        },
        [dispatch],
    );

    const swapCamera = useCallback(
        (view: View, planes: RenderState["clipping"]["planes"], idx: number) => {
            if (view.renderState.camera.kind === "orthographic") {
                if (planes.length > 0) {
                    const planeDir = vec3.fromValues(
                        planes[0].normalOffset[0],
                        planes[0].normalOffset[1],
                        planes[0].normalOffset[2],
                    );
                    dispatch(
                        renderActions.setCamera({
                            type: CameraType.Pinhole,
                            goTo: {
                                position: vec3.scaleAndAdd(
                                    vec3.create(),
                                    view.renderState.camera.position,
                                    planeDir,
                                    15,
                                ),
                                rotation: view.renderState.camera.rotation,
                            },
                        }),
                    );
                } else {
                    dispatch(renderActions.setCamera({ type: CameraType.Pinhole }));
                }
            } else {
                snapToPlane(view, idx, planes[idx].anchorPos);
            }
        },
        [dispatch, snapToPlane],
    );

    const movePlanes = useCallback(
        (view: View, planes: RenderState["clipping"]["planes"], idxList: number[]) => {
            const originalCameraPos = view.renderState.camera.position;
            const originalCameraRot = view.renderState.camera.rotation;
            const cameraDir = getCameraDir(view.renderState.camera.rotation);

            const editedPlanes = planes
                .map((plane, idx) => ({ plane, idx }))
                .filter(({ idx }) => idxList.includes(idx))
                .map(({ plane, idx }) => {
                    const originalAnchorPos = plane.anchorPos;
                    const originalAnchorPos2d = originalAnchorPos
                        ? getAnchorPos2d(view, [originalAnchorPos])[0]
                        : undefined;
                    const originalNormalOffset = plane.normalOffset;
                    const normal = vec3.fromValues(
                        originalNormalOffset[0],
                        originalNormalOffset[1],
                        originalNormalOffset[2],
                    );
                    const isParallelToGround = Math.abs(vec3.dot(normal, vec3.fromValues(0, 0, 1))) > 0.999;
                    const isParallelToCamera = Math.abs(vec3.dot(normal, cameraDir)) > 0.999;
                    const normalOffset = originalNormalOffset;
                    const anchorPos = originalAnchorPos;

                    const anchor = document.querySelector(`#${getClippingPlaneAnchorId(idx)}`) as HTMLElement;
                    const offsetNode = anchor?.querySelector(`[data-offset]`) as HTMLElement;

                    return {
                        idx,
                        originalAnchorPos,
                        originalAnchorPos2d,
                        originalNormalOffset,
                        normal,
                        isParallelToGround,
                        isParallelToCamera,
                        normalOffset,
                        anchorPos,
                        anchor,
                        offsetNode,
                    };
                });

            const moveCameraToPlane = (diff: number) => {
                if (originalCameraRot && originalCameraPos) {
                    const pos = vec3.clone(originalCameraPos);
                    const dir = vec3.fromValues(0, 0, 1);
                    vec3.transformQuat(dir, dir, originalCameraRot);
                    vec3.scaleAndAdd(pos, pos, dir, diff);
                    dispatch(
                        renderActions.setCamera({
                            type: CameraType.Orthographic,
                            goTo: {
                                position: pos,
                                rotation: view.renderState.camera.rotation,
                                far: view.renderState.camera.far,
                            },
                        }),
                    );
                }
            };

            return {
                update(newValues: number[]) {
                    let movedCameraToPlane = false;

                    editedPlanes.forEach((editedPlane, idx) => {
                        const {
                            originalNormalOffset,
                            isParallelToCamera,
                            anchor,
                            originalAnchorPos,
                            originalAnchorPos2d,
                            anchorPos,
                            offsetNode,
                            isParallelToGround,
                        } = editedPlane;
                        const newValue = newValues[idx];
                        editedPlane.normalOffset = vec4.clone(editedPlane.originalNormalOffset);
                        const diff = editedPlane.originalNormalOffset[3] - newValue;
                        const { normalOffset } = editedPlane;
                        normalOffset[3] = newValue;

                        if (cameraType === CameraType.Orthographic && isParallelToCamera && !movedCameraToPlane) {
                            dispatch(renderActions.setClippingInEdit(true));
                            moveCameraToPlane(-diff);
                            movedCameraToPlane = true;
                        }

                        if (anchor && anchorPos && originalAnchorPos) {
                            editedPlane.anchorPos = vec3.scaleAndAdd(
                                vec3.create(),
                                originalAnchorPos,
                                vec3.fromValues(normalOffset[0], normalOffset[1], normalOffset[2]),
                                newValue - originalNormalOffset[3],
                            );

                            let pos2d: ReadonlyVec2 | undefined;
                            if (view.renderState.camera.kind === "orthographic" && isParallelToCamera) {
                                if (originalAnchorPos2d) {
                                    pos2d = vec2.clone(originalAnchorPos2d);
                                    pos2d[1] += diff;
                                }
                            } else {
                                pos2d = getAnchorPos2d(view!, [anchorPos])[0];
                            }

                            if (pos2d) {
                                anchor.style.setProperty("left", `${pos2d[0]}px`);
                                anchor.style.setProperty("top", `${pos2d[1]}px`);
                            }

                            if (offsetNode) {
                                offsetNode.style.setProperty("display", "block");

                                let text = `${diff > 0 ? "+" : ""}${diff.toFixed(2)}m`;
                                if (isParallelToGround) {
                                    text += ` (alt: ${anchorPos[2].toFixed(2)}m)`;
                                }
                                offsetNode.innerText = text;
                            }
                        }

                        return editedPlane;
                    });

                    view.modifyRenderState({
                        clipping: {
                            planes: planes.map((p, i) => {
                                const editedPlane = editedPlanes.find((p2) => p2.idx === i);
                                if (editedPlane) {
                                    const { normalOffset, isParallelToCamera } = editedPlane;

                                    return {
                                        ...editedPlanes,
                                        outline: { enabled: false },
                                        normalOffset,
                                        color:
                                            (cameraType === CameraType.Orthographic && isParallelToCamera) ||
                                            !p.showPlane
                                                ? [0, 0, 0, 0]
                                                : p.color,
                                    };
                                } else if (p.outline?.enabled) {
                                    // Disable all clipping plane outlines while moving slider for better perf
                                    return { ...p, outline: { enabled: false } };
                                }
                                return p;
                            }),
                        },
                    });
                },
                finish(save: boolean) {
                    view.modifyRenderState({
                        outlines: { on: true },
                    });
                    if (save) {
                        dispatch(
                            renderActions.setClippingPlanes({
                                planes: planes.map((p, i) => {
                                    const editedPlane = editedPlanes.find((p2) => p2.idx === i);
                                    if (editedPlane) {
                                        const { normalOffset, anchorPos } = editedPlane;
                                        return { ...p, normalOffset, anchorPos };
                                    }
                                    return p;
                                }),
                            }),
                        );
                    } else {
                        dispatch(
                            renderActions.setClippingPlanes({
                                planes: planes.slice(),
                            }),
                        );
                    }

                    if (cameraType === CameraType.Orthographic) {
                        dispatch(renderActions.setClippingInEdit(false));
                    }

                    for (const { offsetNode, anchor, anchorPos } of editedPlanes) {
                        if (anchorPos) {
                            offsetNode?.style.setProperty("display", "none");

                            const pos2d = getAnchorPos2d(view!, [anchorPos])[0];
                            if (pos2d) {
                                anchor.style.setProperty("left", `${pos2d[0]}px`);
                                anchor.style.setProperty("top", `${pos2d[1]}px`);
                            }
                        }
                    }
                },
            } as MovingPlaneControl;
        },
        [dispatch, cameraType],
    );

    const deletePlane = useCallback(
        (view: View, planes: RenderState["clipping"]["planes"], idx: number) => {
            view.modifyRenderState({
                outlines: { on: true },
            });
            const newPlanes = planes
                .filter((_, i) => i !== idx)
                .map((p, i) => (i === 0 ? { ...p, outline: { enabled: true } } : p));

            dispatch(
                renderActions.setClippingPlanes({
                    planes: newPlanes,
                }),
            );
            if (cameraType === CameraType.Orthographic) {
                dispatch(renderActions.setClippingInEdit(false));
            }

            return newPlanes;
        },
        [dispatch, cameraType],
    );

    const toggleOutlines = useCallback(
        (planes: RenderState["clipping"]["planes"], idx: number, enabled: boolean) => {
            dispatch(
                renderActions.setClippingPlanes({
                    planes: planes.map((p, i) => (i === idx ? { ...p, outline: { enabled } } : p)),
                }),
            );
        },
        [dispatch],
    );

    const setShowPlane = useCallback(
        (planes: RenderState["clipping"]["planes"], idx: number, enabled: boolean) => {
            const newPlanes = [...planes];
            newPlanes[idx] = { ...newPlanes[idx], showPlane: enabled };

            dispatch(renderActions.setClippingPlanes({ planes: newPlanes }));
        },
        [dispatch],
    );

    const alignCamera = useCallback(
        (view: View, planes: RenderState["clipping"]["planes"], idx: number) => {
            const { position, rotation } = getSnapToPlaneParams({
                planeIdx: idx,
                view,
                anchorPos: planes[idx].anchorPos,
                offset: 20,
            });
            dispatch(
                renderActions.setCamera({
                    type: CameraType.Pinhole,
                    goTo: { position, rotation },
                }),
            );
        },
        [dispatch],
    );

    return { swapCamera, deletePlane, movePlanes, toggleOutlines, setShowPlane, alignCamera };
}

export interface MovingPlaneControl {
    update: (newValues: number[]) => void;
    finish: (save: boolean) => void;
}

export function getClippingPlaneAnchorId(index: number) {
    return `clipping-plane-anchor-${index}`;
}

export function getAnchorPos2d(view: View, pos: vec3[]) {
    return view.convert.worldSpaceToScreenSpace(pos);
}
