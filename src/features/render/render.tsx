import { Box, css, styled } from "@mui/material";
import { glMatrix } from "gl-matrix";
import { RefCallback, useCallback, useRef, useState } from "react";

import { useAppSelector } from "app/store";
import { LinearProgress, Loading } from "components";
import { explorerGlobalsActions, useExplorerGlobals } from "contexts/explorerGlobals";
import { useHandleArea } from "features/area";
import { useHandleClipping } from "features/clippingPlanes/useHandleClipping";
import { useHandleDeviations } from "features/deviations";
import { useHandleDitioKeepAlive } from "features/ditio";
import { Engine2D } from "features/engine2D";
import { Engine2DInteractions } from "features/engine2D/engine2DInteractions";
import { useHandleImages } from "features/images";
import { useHandleJiraKeepAlive } from "features/jira";
import { useHandleManhole } from "features/manhole";
import { useHandleLocationMarker } from "features/myLocation";
import { useHandleOffline } from "features/offline";
import { useHandleCrossSection } from "features/orthoCam";
import { useHandleOutlineLasers } from "features/outlineLaser";
import { PerformanceStats } from "features/performanceStats";
import { useHandlePointLine } from "features/pointLine";
import { selectDebugStats, selectLoadingHandles, selectSceneStatus } from "features/render/renderSlice";
import { useHandleXsiteManageKeepAlive, useHandleXsiteManageMachineLocations } from "features/xsiteManage";
import { AsyncStatus } from "types/misc";

import { useCanvasClickHandler } from "./hooks/useCanvasClickHandler";
import { useCanvasEventHandlers } from "./hooks/useCanvasEventHandlers";
import { useHandleAdvancedSettings } from "./hooks/useHandleAdvancedSettings";
import { useHandleBackground } from "./hooks/useHandleBackground";
import { useHandleCameraMoved } from "./hooks/useHandleCameraMoved";
import { useHandleCameraSpeed } from "./hooks/useHandleCameraSpeed";
import { useHandleCameraState } from "./hooks/useHandleCameraState";
import { useHandleCanvasCursor } from "./hooks/useHandleCanvasCursor";
import { useHandleClippingOutlines } from "./hooks/useHandleClippingOutlines";
import { useHandleGrid } from "./hooks/useHandleGrid";
import { useHandleHighlights } from "./hooks/useHandleHighlights";
import { useHandleInit } from "./hooks/useHandleInit";
import { useHandleInitialBookmark } from "./hooks/useHandleInitialBookmark";
import { useHandleSubtrees } from "./hooks/useHandleSubtrees";
import { useHandleTerrain } from "./hooks/useHandleTerrain";
import { Images } from "./images";
import { Markers } from "./markers";
import { SceneError } from "./sceneError";
import { Stamp } from "./stamp";

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
        state: { view, canvas, size },
        dispatch: dispatchGlobals,
    } = useExplorerGlobals();

    const loadingHandles = useAppSelector(selectLoadingHandles);
    const sceneStatus = useAppSelector(selectSceneStatus);
    const debugStats = useAppSelector(selectDebugStats);

    const [svg, setSvg] = useState<null | SVGSVGElement>(null);

    const engine2dRenderFnRef = useRef<((moved: boolean, idleFrame: boolean) => void) | undefined>();
    const pointerPosRef = useRef([0, 0] as [x: number, y: number]);
    const pointerDownStateRef = useRef<{
        timestamp: number;
        x: number;
        y: number;
    }>();
    const canvasRef: RefCallback<HTMLCanvasElement> = useCallback(
        (el) => {
            dispatchGlobals(explorerGlobalsActions.update({ canvas: el }));
        },
        [dispatchGlobals]
    );

    useHandleInit();
    useHandleInitialBookmark();
    useHandleCameraMoved({ svg, engine2dRenderFnRef });
    useHandleCameraState();
    useHandleCameraSpeed();
    useHandleGrid();
    useHandleBackground();
    useHandleHighlights();
    useHandleSubtrees();
    useHandleTerrain();
    useHandleAdvancedSettings();
    useHandleClipping();
    useHandlePointLine();
    useHandleArea();
    useHandleManhole();
    useHandleLocationMarker();
    useHandleCrossSection();
    useHandleDeviations();
    useHandleImages();
    useHandleClippingOutlines();
    useHandleOutlineLasers();

    useHandleJiraKeepAlive();
    useHandleXsiteManageKeepAlive();
    useHandleXsiteManageMachineLocations();
    useHandleDitioKeepAlive();
    useHandleOffline();

    const cursor = useHandleCanvasCursor();
    const onClick = useCanvasClickHandler({ pointerDownStateRef });
    const eventHandlers = useCanvasEventHandlers({
        pointerPosRef,
        cursor,
        svg,
        pointerDownStateRef,
        engine2dRenderFnRef,
    });

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
                    <Engine2D pointerPos={pointerPosRef} renderFnRef={engine2dRenderFnRef} svg={svg} />
                    <Stamp />
                    <Svg width={size.width} height={size.height} ref={setSvg}>
                        <Markers />
                        <Engine2DInteractions />
                        <g id="cursor" />
                    </Svg>
                    <Images />
                </>
            )}
        </Box>
    );
}
