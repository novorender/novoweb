declare module "@novorender/data-js-api" {
    import { vec3 } from "gl-matrix";

    import { ExtendedMeasureEntity, ViewMode } from "types/misc";

    interface API {
        serviceUrl: string;
    }

    type ExplorerBookmarkState = {
        camera: {
            kind: "pinhole" | "orthographic";
            position: [number, number, number];
            rotation: [number, number, number, number];
            fov: number;
            near: number;
            far: number;
        };
        viewMode: ViewMode;
        groups: { id: string; status: "none" | "selected" | "hidden" | "frozen" }[];
        objects: {
            mainObject: {
                id: number | undefined;
            };
            defaultVisibility: "transparent" | "semiTransparent" | "neutral";
            hidden: { ids: number[] };
            highlighted: {
                ids: number[];
            };
            highlightCollections: {
                secondaryHighlight: {
                    ids: number[];
                };
            };
            selectionBasket: { ids: number[]; mode: number };
        };
        background: {
            color: [number, number, number, number];
        };
        options: {
            addToSelectionBasket: boolean;
        };
        deviations:
            | {
                  index: number; // deprecated in favor of profileId
                  mixFactor: number;
                  profileId?: string;
                  subprofileIndex?: number;
                  isLegendFloating: boolean;
                  hiddenGroupIds?: string[];
              }
            | undefined;
        subtrees: {
            triangles: boolean;
            lines: boolean;
            terrain: boolean;
            points: boolean;
            documents: boolean;
        };
        clipping: {
            enabled: boolean;
            mode: number;
            outlines?: boolean;
            planes: {
                normalOffset: [number, number, number, number];
                color: [number, number, number, number];
                showPlane: boolean;
                outline?: {
                    enabled: boolean;
                };
                anchorPos?: [number, number, number];
            }[];
        };
        grid: {
            enabled: boolean;
            origin: [number, number, number];
            distance: number;
            axisX: [number, number, number];
            axisY: [number, number, number];
            color1: [number, number, number];
            color2: [number, number, number];
            size1: number;
            size2: number;
        };
        terrain: {
            asBackground: boolean;
            elevationGradient: {
                knots: { position: number; color: VecRGB }[];
            };
        };
        pointVisualization: {
            classificationColorGradient: {
                knots: LabeledKnot[];
                undefinedColor: VecRGBA;
            };
            defaultPointVisualization: PointVisualization;
        };
        measurements: {
            area:
                | {
                      /** @deprecated  Use only to read legacy bookmarks */
                      points: [point: [number, number, number]][];
                  }
                | {
                      areas: { points: [number, number, number][] }[];
                  };
            pointLine:
                | {
                      /** @deprecated  Use only to read legacy bookmarks */
                      points: [number, number, number][];
                  }
                | {
                      pointLines: [number, number, number][][];
                  };
            manhole: {
                id: number | undefined;
                collisionTarget:
                    | {
                          selected: { id: number; pos: vec3 };
                      }
                    | undefined;
                collisionSettings: MeasureSettings | undefined;
            };
            measure: {
                entities: ExtendedMeasureEntity[] | ExtendedMeasureEntity[][];
                activeAxis?: (
                    | {
                          x: boolean;
                          y: boolean;
                          z: boolean;
                          planar: boolean;
                          result: boolean;
                          normal: boolean;
                      }
                    | undefined
                )[];
            };
        };
        followPath:
            | {
                  selected: {
                      positions?: { id: number; pos: [number, number, number] }[];
                      landXmlPathId?: number;
                      ids: number[];
                  };
                  drawLayers: {
                      roadIds: string[];
                  };
                  profileNumber: number;
                  currentCenter: [number, number, number];
                  deviations?: {
                      prioritization: "minimum" | "maximum";
                      line: boolean;
                      lineColor: [number, number, number, number];
                  };
                  verticalClipping?: boolean;
                  followObject?: {
                      type: "edge" | "curve" | "cylinder" | "cylinders";
                      ids: ObjectId[];
                      selectedEntity: MeasureEntity | undefined;
                      parameterBounds: ParameterBounds;
                      emulatedCurve?: { start: ReadonlyVec3; dir: ReadonlyVec3 } | undefined;
                      lineStrip?: ReadonlyVec3[];
                  };
                  profileRange?: { min: number; max: number };
              }
            | undefined;
        outlineMeasure:
            | {
                  laserPlane: ReadonlyVec4;
                  lasers: {
                      laserPosition: ReadonlyVec3;
                      measurementX?: { start: ReadonlyVec3; end: ReadonlyVec3 };
                      measurementY?: { start: ReadonlyVec3; end: ReadonlyVec3 };
                      measurementZ?: { start: ReadonlyVec3; end: ReadonlyVec3 };
                      laserPlanes?: ReadonlyVec4[];
                  }[];
              }
            | undefined;
        propertyTree?: {
            property: string;
            groups: {
                propertyValue: string;
                ids: number[];
                color: [number, number, number, number];
                status: "hidden" | "selected";
            }[];
        };
        arcgis?: {
            featureServers: {
                id: string;
                layers: {
                    id: number;
                    checked: boolean;
                }[];
            }[];
        };
    };

    interface Bookmark {
        explorerState?: ExplorerBookmarkState;

        // LEGACY bookmarks
        followPath?:
            | {
                  id: number;
                  profile: number;
                  currentCenter?: vec3;
              }
            | {
                  ids: number[];
                  profile: number;
                  currentCenter?: vec3;
                  roadIds?: string[];
              }
            | {
                  parametric: {
                      id: number;
                      pos: vec3;
                  }[];
                  profile: number;
                  currentCenter?: vec3;
              };
        area?: {
            pts: [point: vec3, normal: vec3][];
        };
        pointLine?: {
            pts: vec3[];
        };
        subtrees?: {
            triangles: boolean;
            lines: boolean;
            terrain: boolean;
            points: boolean;
            documents: boolean;
        };
        options?: {
            addSelectedToSelectionBasket?: boolean;
        };
        manhole?: {
            id: number;
            collisionTarget?: {
                selected: { id: number; pos: vec3 };
            };
            collisionSettings?: MeasureSettings;
        };
        selectedMeasureEntities?: ExtendedMeasureEntity[];
        viewMode?: ViewMode;
        highlightCollections?: {
            secondaryHighlight: {
                ids: number[];
            };
        };
        deviations?: {
            index: number;
            mode: "on" | "off" | "mix";
        };
        background?: {
            color: Vec4;
        };
    }

    interface ObjectGroup {
        frozen: boolean;
    }
}
