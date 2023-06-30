import { Box, css, styled } from "@mui/material";
import { glMatrix } from "gl-matrix";
import { RefCallback, useCallback, useRef, useState } from "react";

import { useAppSelector } from "app/store";
import { LinearProgress, Loading } from "components";
import { explorerGlobalsActions, useExplorerGlobals } from "contexts/explorerGlobals";
import { Engine2D } from "features/engine2D";
import { PerformanceStats } from "features/performanceStats";
import { selectDebugStats, selectLoadingHandles, selectSceneStatus } from "features/render/renderSlice";
import { AsyncStatus } from "types/misc";

import { useHandleClipping } from "features/clippingPlanes/useHandleClipping";
import { useCanvasClickHandler } from "./hooks/useCanvasClickHandler";
import { useHandleAdvancedSettings } from "./hooks/useHandleAdvancedSettings";
import { useHandleBackground } from "./hooks/useHandleBackground";
import { useHandleCameraMoved } from "./hooks/useHandleCameraMoved";
import { useHandleCameraSpeed } from "./hooks/useHandleCameraSpeed";
import { useHandleCameraState } from "./hooks/useHandleCameraState";
import { useHandleHighlights } from "./hooks/useHandleHighlights";
import { useHandleInit } from "./hooks/useHandleInit";
import { useHandleInitialBookmark } from "./hooks/useHandleInitialBookmark";
import { useHandleSubtrees } from "./hooks/useHandleSubtrees";
import { useHandleTerrain } from "./hooks/useHandleTerrain";
import { Images } from "./images";
import { Markers } from "./markers";
import { SceneError } from "./sceneError";
import { Stamp } from "./stamp";
import { useCanvasEventHandlers } from "./hooks/useCanvasEventHandlers";
import { useHandleCanvasCursor } from "./hooks/useHandleCanvasCursor";
import { useHandlePointLineUpdates } from "features/pointLine";

glMatrix.setMatrixArrayType(Array);

const Canvas = styled("canvas")(
    () => css`
        outline: 0;
        touch-action: none;
        height: 100vh;
        width: 100vw;
    `
);

const Svg = styled("svg")(
    () => css`
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        pointer-events: none;

        g {
            will-change: transform;
        }
    `
);

export function Render3D() {
    const {
        state: { view, canvas, scene },
        dispatch: dispatchGlobals,
    } = useExplorerGlobals();

    const loadingHandles = useAppSelector(selectLoadingHandles);
    const sceneStatus = useAppSelector(selectSceneStatus);
    const debugStats = useAppSelector(selectDebugStats);

    const [svg, setSvg] = useState<null | SVGSVGElement>(null);

    const pointerPos = useRef([0, 0] as [x: number, y: number]);
    const canvasRef: RefCallback<HTMLCanvasElement> = useCallback(
        (el) => {
            dispatchGlobals(explorerGlobalsActions.update({ canvas: el }));
        },
        [dispatchGlobals]
    );

    useHandleInit();
    useHandleInitialBookmark();
    useHandleCameraMoved();
    useHandleCameraState();
    useHandleCameraSpeed();
    useHandleBackground();
    useHandleHighlights();
    useHandleSubtrees();
    useHandleTerrain();
    useHandleAdvancedSettings();
    useHandleClipping();
    useHandlePointLineUpdates();

    const useSvgCursor = useHandleCanvasCursor();
    const onClick = useCanvasClickHandler();
    const eventHandlers = useCanvasEventHandlers({ pointerPos, useSvgCursor, svg });

    window.view = view;
    (window as any).scene = scene;

    return (
        <Box position="relative" width="100%" height="100%" sx={{ userSelect: "none" }}>
            {loadingHandles.length !== 0 && (
                <Box position={"absolute"} top={0} width={1} display={"flex"} justifyContent={"center"}>
                    <LinearProgress />
                </Box>
            )}
            {sceneStatus.status === AsyncStatus.Error && <SceneError />}
            <Canvas id="main-canvas" onClick={onClick} {...eventHandlers} tabIndex={1} ref={canvasRef} />
            {[AsyncStatus.Initial, AsyncStatus.Loading].includes(sceneStatus.status) && <Loading />}
            {sceneStatus.status === AsyncStatus.Success && view && canvas && (
                <>
                    {debugStats.enabled && <PerformanceStats />}
                    <Engine2D pointerPos={pointerPos} />
                    <Stamp />
                    <Svg width={canvas.width} height={canvas.height} ref={setSvg}>
                        <Markers />
                        <g id="cursor" />
                    </Svg>
                    <Images />
                </>
            )}
        </Box>
    );
}
