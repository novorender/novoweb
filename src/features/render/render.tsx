import { glMatrix, vec4 } from "gl-matrix";
import { useState, useRef, useCallback, RefCallback } from "react";
import { Box, styled, css } from "@mui/material";

import { PerformanceStats } from "features/performanceStats";
import { LinearProgress, Loading } from "components";
import { selectLoadingHandles, selectSceneStatus } from "features/render/renderSlice";
import { useAppSelector } from "app/store";
import { Engine2D } from "features/engine2D";
import { explorerGlobalsActions, useExplorerGlobals } from "contexts/explorerGlobals";
import { AsyncStatus } from "types/misc";

import { SceneError } from "./sceneError";
import { Stamp } from "./stamp";
import { Markers } from "./markers";
import { Images } from "./images";
import { useHandleBackground } from "./hooks/useHandleBackground";
import { useHandleHighlights } from "./hooks/useHandleHighlights";
import { useHandleInit } from "./hooks/useHandleInit";
import { useHandleSubtrees } from "./hooks/useHandleSubtrees";
import { useCanvasClickHandler } from "./hooks/useCanvasClickHandler";
import { useHandleCameraMoved } from "./hooks/useHandleCameraMoved";
import { useHandleCameraStateChange } from "./hooks/useHandleCameraStateChange";

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
        state: { view, canvas },
        dispatch: dispatchGlobals,
    } = useExplorerGlobals();

    const loadingHandles = useAppSelector(selectLoadingHandles);
    const sceneStatus = useAppSelector(selectSceneStatus);

    const [_svg, setSvg] = useState<null | SVGSVGElement>(null);

    const pointerPos = useRef([0, 0] as [x: number, y: number]);
    const canvasRef: RefCallback<HTMLCanvasElement> = useCallback(
        (el) => {
            dispatchGlobals(explorerGlobalsActions.update({ canvas: el }));
        },
        [dispatchGlobals]
    );

    const canvasClickHandler = useCanvasClickHandler();

    useHandleInit();
    useHandleCameraMoved();
    useHandleCameraStateChange();
    useHandleBackground();
    useHandleHighlights();
    useHandleSubtrees();

    window.view = view;

    return (
        <Box position="relative" width="100%" height="100%" sx={{ userSelect: "none" }}>
            {loadingHandles.length !== 0 && (
                <Box position={"absolute"} top={0} width={1} display={"flex"} justifyContent={"center"}>
                    <LinearProgress />
                </Box>
            )}
            {sceneStatus.status === AsyncStatus.Error && <SceneError />}
            <Canvas id="main-canvas" onClick={canvasClickHandler} tabIndex={1} ref={canvasRef} />
            {[AsyncStatus.Initial, AsyncStatus.Loading].includes(sceneStatus.status) && <Loading />}
            {sceneStatus.status === AsyncStatus.Success && view && canvas && (
                <>
                    <PerformanceStats />
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

export type CustomProperties = {
    enabledFeatures?: Record<string, boolean>;
    showStats?: boolean;
    navigationCube?: boolean;
    ditioProjectNumber?: string;
    flightMouseButtonMap?: {
        rotate: number;
        pan: number;
        orbit: number;
        pivot: number;
    };
    flightFingerMap?: {
        rotate: number;
        pan: number;
        orbit: number;
        pivot: number;
    };
    autoFps?: boolean;
    maxTriangles?: number;
    triangleLimit?: number;
    jiraSettings?: {
        space: string;
        project: string;
        component: string;
    };
    primaryMenu?: {
        button1: string;
        button2: string;
        button3: string;
        button4: string;
        button5: string;
    };
    xsiteManageSettings?: {
        siteId: string;
    };
    highlights?: {
        primary: {
            color: vec4;
        };
        secondary: {
            color: vec4;
            property: string;
        };
    };
    cameraSpeedLevels?: {
        flight: {
            slow: number;
            default: number;
            fast: number;
        };
    };
    pointerLock?: {
        ortho: boolean;
    };
    proportionalCameraSpeed?: {
        enabled: boolean;
        min: number;
        max: number;
        pickDelay: number;
    };
    defaultTopDownElevation?: number;
    properties?: {
        stampSettings: {
            enabled: boolean;
            properties: string[];
        };
        starred: string[];
    };
    canvasContextMenu?: {
        features: string[];
    };
    requireConsent?: boolean;
    features?: {
        render?: {
            full: boolean;
        };
        debugInfo?: {
            quality?: boolean;
            boundingBoxes?: boolean;
            holdDynamic?: boolean;
            render?: boolean;
            queueSize?: boolean;
            performanceTab?: boolean;
        };
        doubleSided?: boolean;
        bakeResources?: boolean;
        vr?: boolean;
        BIM360?: boolean;
        BIMCollab?: boolean;
        bimcollab?: boolean;
        bimTrack?: boolean;
        ditio?: boolean;
        jira?: boolean;
        xsiteManage?: boolean;
    };
};
export function getCustomProperties(customProperties: any = {}): CustomProperties {
    if (!customProperties || typeof customProperties !== "object") {
        return {};
    }

    return customProperties as CustomProperties;
}
