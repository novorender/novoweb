export type ExplorerProjectState = {
    camera: {
        pinhole: {
            controller: "flight" | "special" | "cadRightPan" | "cadMiddlePan";
            clipping: {
                far: number;
                near: number;
            };
            speedLevels: {
                slow: number;
                default: number;
                fast: number;
            };
            proportionalSpeed: {
                enabled: boolean;
                min: number;
                max: number;
            };
        };
        orthographic: {
            controller: "ortho";
            clipping: {
                far: number;
                near: number;
            };
            usePointerLock: boolean;
            topDownElevation: undefined | number;
            topDownSnapToAxis?: "north";
        };
    };
    renderSettings: {
        dynamicResolutionScaling: boolean;
        msaa: {
            enabled: boolean;
            samples: number;
        };
        toonOutline: {
            enabled: boolean;
            color: [number, number, number];
        };
        outlines: {
            enabled: boolean;
            color: [number, number, number];
            plane: [number, number, number, number];
        };
        tonemapping: {
            exposure: number;
            mode: number;
        };
        pick: {
            opacityThreshold: number;
        };
        limits: {
            maxPrimitives: number;
        };
        points: {
            size: {
                pixel: number;
                maxPixel: number;
                metric: number;
                toleranceFactor: number;
            };
            deviation: {
                index: number;
                mixFactor: number;
                colorGradient: {
                    knots: {
                        position: number;
                        color: [number, number, number, number];
                    }[];
                };
            };
        };
        hide: {
            terrain: boolean;
            triangles: boolean;
            points: boolean;
            documents: boolean;
            lines: boolean;
        };
        terrain: {
            asBackground: boolean;
            elevationGradient: {
                knots: {
                    position: number;
                    color: [number, number, number];
                }[];
            };
        };
        background: {
            color: [number, number, number, number];
            blur: number;
            url: string;
        };
    };
    features: {
        widgets: {
            enabled: string[];
        };
        properties: {
            stamp: {
                enabled: boolean;
            };
            starred: string[];
        };
        navigationCube: {
            enabled: boolean;
        };
        debugStats: {
            enabled: boolean;
        };
        primaryMenu: {
            buttons: string[];
        };
        contextMenus: {
            canvas: {
                primary: {
                    features: string[];
                };
            };
        };
    };
    highlights: {
        primary: {
            color: [number, number, number, number];
        };
        secondary: {
            color: [number, number, number, number];
            property: string;
        };
    };
};

type Integrations = {
    jira?: {
        space: string;
        project: string;
        component: string;
    };
    ditio?: {
        projectNumber: string;
    };
    xsiteManage: {
        siteId: string;
    };
};

export type CustomProperties = {
    explorerProjectState?: ExplorerProjectState;
    integrations?: Integrations;
    initialCameraState?: {
        kind: "pinhole" | "orthographic";
        position: [number, number, number];
        rotation: [number, number, number, number];
        fov: number;
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
    // NOTE(OLA): Legacy properties below
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
            color: [number, number, number, number];
        };
        secondary: {
            color: [number, number, number, number];
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
};
