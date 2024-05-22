import { CoreModule, LoadStatus, MeasureEntity } from "@novorender/api";
import { vec2, vec3 } from "gl-matrix";
import {
    KeyboardEvent,
    MouseEvent,
    MutableRefObject,
    PointerEvent as ReactPointerEvent,
    TouchEvent,
    useRef,
    WheelEvent,
} from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectShowTracer } from "features/followPath";
import { measureActions, selectMeasureHoverSettings } from "features/measure";
import { orthoCamActions, selectCrossSectionPoint } from "features/orthoCam";
import { ViewMode } from "types/misc";

import {
    renderActions,
    selectCameraType,
    selectClippingPlanes,
    selectPicker,
    selectPoints,
    selectStamp,
    selectSubtrees,
    selectViewMode,
} from "../renderSlice";
import { moveSvgCursor } from "../svgUtils";
import { CameraType, Picker, StampKind, SubtreeStatus } from "../types";
import { useCanvasContextMenuHandler } from "./useCanvasContextMenuHandler";

export const isIpad =
    /\biPad/.test(navigator.userAgent) ||
    (/\bMobile\b/.test(navigator.userAgent) && /\bMacintosh\b/.test(navigator.userAgent));
export const isIphone = /\biPhone/.test(navigator.userAgent);

export function useCanvasEventHandlers({
    pointerPosRef,
    cursor,
    svg,
    engine2dRenderFnRef,
    pointerDownStateRef,
}: {
    pointerPosRef: MutableRefObject<[x: number, y: number]>;
    cursor: "measure" | "cross" | "standard";
    svg: SVGSVGElement | null;
    engine2dRenderFnRef: MutableRefObject<((moved: boolean, isIdleFrame: boolean) => void) | undefined>;
    pointerDownStateRef: MutableRefObject<
        | {
              timestamp: number;
              x: number;
              y: number;
          }
        | undefined
    >;
}) {
    const {
        state: { view, canvas, size },
    } = useExplorerGlobals();
    const handleCanvasContextMenu = useCanvasContextMenuHandler();
    const measureHoverSettings = useAppSelector(selectMeasureHoverSettings);
    const clippingPlanes = useAppSelector(selectClippingPlanes);
    const picker = useAppSelector(selectPicker);
    const crossSectionPoint = useAppSelector(selectCrossSectionPoint);
    const deviation = useAppSelector(selectPoints).deviation;
    const stamp = useAppSelector(selectStamp);
    const subtrees = useAppSelector(selectSubtrees);
    const cameraType = useAppSelector(selectCameraType);
    const roadLayerTracerEnabled = useAppSelector(selectShowTracer);
    const viewMode = useAppSelector(selectViewMode);
    const dispatch = useAppDispatch();

    const hideSvgCursor = () =>
        svg &&
        view &&
        moveSvgCursor({
            svg,
            view,
            size,
            pickResult: undefined,
            x: -100,
            y: -100,
            color: "",
            overrideKind: undefined,
        });

    const clippingPlaneCommitTimer = useRef<ReturnType<typeof setTimeout>>();
    const moveClippingPlanes = (delta: number) => {
        if (!view || cameraType === CameraType.Orthographic) {
            return;
        }

        if (clippingPlaneCommitTimer.current) {
            clearTimeout(clippingPlaneCommitTimer.current);
        }

        view.modifyRenderState({
            clipping: {
                planes: view.renderState.clipping.planes.map((plane) => ({
                    ...plane,
                    normalOffset: [
                        plane.normalOffset[0],
                        plane.normalOffset[1],
                        plane.normalOffset[2],
                        plane.normalOffset[3] + -delta,
                    ],
                })),
            },
        });

        clippingPlaneCommitTimer.current = setTimeout(() => {
            dispatch(
                renderActions.setClippingPlanes({
                    planes: view.renderState.clipping.planes.map((plane) => ({
                        color: plane.color ? [...plane.color] : [0, 1, 0, 1],
                        baseW: plane.normalOffset[3],
                        normalOffset: [...plane.normalOffset],
                    })),
                })
            );
        }, 100);
    };

    const handleDown = async (x: number, y: number, timestamp: number) => {
        pointerDownStateRef.current = {
            timestamp,
            x,
            y,
        };
    };

    const onWheel = (e: WheelEvent<HTMLCanvasElement>) => {
        if (!e.shiftKey || !clippingPlanes.enabled) {
            return;
        }

        moveClippingPlanes(-(e.deltaY / 100));
    };

    const onContextMenu = (evt: MouseEvent<HTMLCanvasElement>) => {
        const isTouch = evt.nativeEvent instanceof PointerEvent && evt.nativeEvent.pointerType === "touch";
        if (!isTouch) {
            return;
        }

        evt.preventDefault();
        handleCanvasContextMenu([evt.clientX, evt.clientY], isTouch);
    };

    // Need this until contextmenu event is supported in mobile safari.
    // 'oncontextmenu' in window == true, but doesn't fire.
    const contextMenuTouchState = useRef<{
        startPos: Vec2;
        currentPos: Vec2;
        timer: ReturnType<typeof setTimeout>;
    }>();
    const onTouchStart = (e: TouchEvent<HTMLCanvasElement>) => {
        if (contextMenuTouchState.current) {
            clearTimeout(contextMenuTouchState.current.timer);
            contextMenuTouchState.current = undefined;
        }

        if ((isIphone || isIpad) && e.touches.length === 1) {
            dispatch(renderActions.setStamp(null));
            const pos = [e.touches[0].clientX, e.touches[0].clientY] as Vec2;
            contextMenuTouchState.current = {
                startPos: pos,
                currentPos: [...pos],
                timer: setTimeout(() => {
                    if (
                        contextMenuTouchState.current &&
                        vec2.dist(contextMenuTouchState.current.startPos, contextMenuTouchState.current.currentPos) <=
                            10
                    ) {
                        handleCanvasContextMenu(contextMenuTouchState.current.currentPos, true);
                        contextMenuTouchState.current = undefined;
                    }
                }, 500),
            };
        }
    };

    const prevPinchDiff = useRef<number>(0);
    const onTouchMove = (e: TouchEvent<HTMLCanvasElement>) => {
        if (contextMenuTouchState.current && e.touches.length === 1) {
            contextMenuTouchState.current.currentPos[0] = e.touches[0].clientX;
            contextMenuTouchState.current.currentPos[1] = e.touches[0].clientY;
        }

        if (e.touches.length === 4 && clippingPlanes.enabled) {
            const touches = Array.from(e.touches).sort((a, b) => a.clientY - b.clientY);
            const top = (touches[0].clientY + touches[1].clientY, touches[2].clientY) / 3;
            const bot = touches[3].clientY;
            const diff = top - bot;

            if (Math.abs(prevPinchDiff.current - diff) >= 1) {
                moveClippingPlanes(Math.sign(prevPinchDiff.current - diff) * 0.1);
            }

            prevPinchDiff.current = diff;
        }
    };

    const onTouchEnd = () => {
        if (contextMenuTouchState.current) {
            clearTimeout(contextMenuTouchState.current.timer);
            contextMenuTouchState.current = undefined;
        }
    };

    const contextMenuCursorState = useRef<{
        timestamp: number;
        startPos: Vec2;
        currentPos: Vec2;
    }>();
    const onMouseDown = (e: MouseEvent) => {
        contextMenuCursorState.current = undefined;
        if (e.button === 2) {
            contextMenuCursorState.current = {
                timestamp: e.timeStamp,
                startPos: [e.clientX, e.clientY],
                currentPos: [e.clientX, e.clientY],
            };
            return;
        } else if (e.button !== 0) {
            return;
        }

        handleDown(e.nativeEvent.offsetX, e.nativeEvent.offsetY, e.timeStamp);
    };

    const prevHoverUpdate = useRef(0);
    const prevHoverEnt = useRef<Awaited<ReturnType<CoreModule["pickMeasureEntityOnCurrentObject"]>>>();
    const previous2dSnapPos = useRef(vec2.create());
    const onPointerMove = async (e: ReactPointerEvent<HTMLCanvasElement>) => {
        pointerPosRef.current = [e.nativeEvent.offsetX, e.nativeEvent.offsetY];

        if (roadLayerTracerEnabled) {
            // TODO: dont call renderfn directly from here.
            engine2dRenderFnRef.current?.(false, false);
        }

        if (!view || !canvas || !svg || (!e.movementY && !e.movementX)) {
            return;
        }

        const planePicking = cameraType === CameraType.Orthographic && view.renderState.camera.far < 1;
        const hoverOutline = (cursorPosition: vec3) => {
            if (view.renderState.clipping.planes.length && measureHoverSettings.point) {
                if (planePicking) {
                    return view.selectOutlinePoint(cursorPosition, measureHoverSettings.point);
                } else {
                    const plane = view.renderState.clipping.planes[0].normalOffset;
                    const planeDir = vec3.fromValues(plane[0], plane[1], plane[2]);
                    const rayDir = vec3.sub(vec3.create(), view.renderState.camera.position, cursorPosition);
                    vec3.normalize(rayDir, rayDir);
                    const d = vec3.dot(planeDir, rayDir);
                    if (d > 0) {
                        const t = (plane[3] - vec3.dot(planeDir, view.renderState.camera.position)) / d;
                        const pos = vec3.scaleAndAdd(vec3.create(), view.renderState.camera.position, rayDir, t);
                        return view.selectOutlinePoint(pos, measureHoverSettings.point);
                    }
                }
            }
        };
        const pointToHover = (point: vec3, objectId: number) => {
            return {
                status: "loaded" as LoadStatus,
                connectionPoint: point,
                entity: {
                    ObjectId: objectId,
                    drawKind: "vertex",
                    parameter: point,
                } as MeasureEntity,
            };
        };

        if (e.buttons === 0 && cursor === "measure") {
            const result = await view.pick(e.nativeEvent.offsetX, e.nativeEvent.offsetY, {
                sampleDiscRadius: 4,
                async: false,
                pickCameraPlane: planePicking,
            });

            let hoverEnt = prevHoverEnt.current;
            const now = performance.now();
            const shouldPickHoverEnt = now - prevHoverUpdate.current > 75 && !view.activeController.moving;
            const checkResetHover = () => {
                const currentPos = vec2.fromValues(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                if (vec2.dist(currentPos, previous2dSnapPos.current) > 25) {
                    hoverEnt = undefined;
                }
            };

            if (shouldPickHoverEnt) {
                prevHoverUpdate.current = now;

                if (picker === Picker.Measurement) {
                    if (result) {
                        let outlinePoint: vec3 | undefined;
                        if (view.renderState.clipping.planes.length && measureHoverSettings.point) {
                            outlinePoint = hoverOutline(result.position);
                        }
                        if (outlinePoint) {
                            hoverEnt = pointToHover(outlinePoint, result.objectId);
                        } else if (view.measure && !planePicking) {
                            const dist =
                                hoverEnt?.connectionPoint && vec3.dist(result.position, hoverEnt.connectionPoint);
                            const newObjectThreshold =
                                vec3.dist(result.position, view.renderState.camera.position) / 50;

                            if (!dist || dist > newObjectThreshold) {
                                const hoverScale = Math.min(Math.max(newObjectThreshold, 0.03), 2);
                                const adjustedSettings = {
                                    edge: measureHoverSettings.edge
                                        ? measureHoverSettings.edge * hoverScale
                                        : undefined,
                                    face: measureHoverSettings.face
                                        ? measureHoverSettings.face * hoverScale
                                        : undefined,
                                    point: measureHoverSettings.point
                                        ? measureHoverSettings.point * hoverScale
                                        : undefined,
                                    segment: measureHoverSettings.segment
                                        ? measureHoverSettings.segment * hoverScale
                                        : undefined,
                                };
                                hoverEnt = await view.measure.core.pickMeasureEntityOnCurrentObject(
                                    result.objectId,
                                    result.position,
                                    adjustedSettings
                                );
                            }
                            vec2.copy(
                                previous2dSnapPos.current,
                                vec2.fromValues(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
                            );
                        }
                    } else {
                        checkResetHover();
                    }
                    prevHoverEnt.current = hoverEnt;
                } else if (picker === Picker.Area || picker === Picker.PointLine) {
                    if (result && view.renderState.clipping.planes.length && measureHoverSettings.point) {
                        const outlinePoint = hoverOutline(result.position);
                        if (outlinePoint) {
                            hoverEnt = pointToHover(outlinePoint, result.objectId);
                            dispatch(measureActions.selectHoverObj(hoverEnt?.entity));
                            vec2.copy(
                                previous2dSnapPos.current,
                                vec2.fromValues(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
                            );
                        } else {
                            checkResetHover();
                        }
                    } else {
                        checkResetHover();
                    }
                } else if (picker === Picker.CrossSection) {
                    const position =
                        result?.position ??
                        view.worldPositionFromPixelPosition(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                    if (crossSectionPoint && position) {
                        dispatch(orthoCamActions.setCrossSectionHover(position as vec3));
                    }
                }
                dispatch(measureActions.selectHoverObj(hoverEnt?.entity));
            }

            const color =
                !hoverEnt?.entity && !result?.objectId
                    ? "red"
                    : hoverEnt?.status === "loaded"
                    ? "lightgreen"
                    : hoverEnt?.entity === undefined || hoverEnt.status === "unknown"
                    ? "blue"
                    : "yellow";

            if (!hoverEnt?.entity || hoverEnt.entity.drawKind === "face") {
                moveSvgCursor({
                    svg,
                    view,
                    size,
                    pickResult: result,
                    x: e.nativeEvent.offsetX,
                    y: e.nativeEvent.offsetY,
                    color,
                    overrideKind: undefined,
                });
            } else {
                moveSvgCursor({
                    svg,
                    view,
                    size,
                    pickResult: undefined,
                    x: e.nativeEvent.offsetX,
                    y: e.nativeEvent.offsetY,
                    color: color,
                    overrideKind: hoverEnt.entity.drawKind === "edge" ? "edge" : "corner",
                });
            }
            return;
        } else if (cursor === "cross") {
            moveSvgCursor({
                svg,
                view,
                size,
                pickResult: undefined,
                x: e.nativeEvent.offsetX,
                y: e.nativeEvent.offsetY,
                color: "white",
                overrideKind: "cross",
            });
        } else {
            hideSvgCursor();
        }

        const setDeviationStamp =
            !stamp?.pinned &&
            deviation.mixFactor !== 0 &&
            cameraType === CameraType.Orthographic &&
            [ViewMode.CrossSection, ViewMode.FollowPath, ViewMode.Deviations].includes(viewMode) &&
            e.buttons === 0 &&
            subtrees.points === SubtreeStatus.Shown;
        if (setDeviationStamp) {
            const isTouch = e.nativeEvent instanceof PointerEvent && e.nativeEvent.pointerType === "touch";
            const measurement = await view.pick(e.nativeEvent.offsetX, e.nativeEvent.offsetY, {
                sampleDiscRadius: isTouch ? 8 : 1,
            });

            if (measurement?.deviation !== undefined) {
                dispatch(
                    renderActions.setStamp({
                        kind: StampKind.Deviation,
                        pinned: false,
                        mouseX: e.nativeEvent.offsetX,
                        mouseY: e.nativeEvent.offsetY,
                        data: { deviation: measurement.deviation },
                    })
                );
            } else {
                dispatch(renderActions.setStamp(null));
            }
        } else if (stamp && !stamp.pinned) {
            dispatch(renderActions.setStamp(null));
        }

        if (contextMenuCursorState.current) {
            contextMenuCursorState.current.currentPos[0] += e.movementX;
            contextMenuCursorState.current.currentPos[1] += e.movementY;
        }
    };

    const onMouseUp = (e: MouseEvent) => {
        if (e.buttons === 0 && e.button === 2) {
            const cursorState = contextMenuCursorState.current;

            if (!cursorState) {
                return;
            }

            const longPress = e.timeStamp - cursorState.timestamp >= 300;
            const drag = vec2.dist(cursorState.startPos, cursorState.currentPos) >= 5;
            contextMenuCursorState.current = undefined;

            if (longPress || drag) {
                return;
            }

            handleCanvasContextMenu(cursorState.currentPos, false);
        } else if (e.button !== 0) {
            return;
        }
    };

    const onPointerEnter = (e: ReactPointerEvent<HTMLCanvasElement>) => {
        if (e.pointerType === "mouse") {
            return;
        }
        handleDown(e.nativeEvent.offsetX, e.nativeEvent.offsetY, e.timeStamp);
    };

    const onPointerOut = () => {
        hideSvgCursor();
    };

    const onKeyUp = (evt: KeyboardEvent<HTMLCanvasElement>) => {
        if (evt.key === "Escape") {
            dispatch(renderActions.setPicker(Picker.Object));
            hideSvgCursor();
        }
    };

    return {
        onWheel,
        onContextMenu,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        onTouchCancel: onTouchEnd,
        onMouseDown,
        onMouseUp,
        onPointerEnter,
        onPointerMove,
        onPointerOut,
        onKeyUp,
    };
}
