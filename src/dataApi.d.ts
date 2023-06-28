declare module "@novorender/data-js-api" {
    import { vec3 } from "gl-matrix";
    import { MeasureSettings } from "@novorender/measure-api";
    import { ExtendedMeasureEntity, ViewMode } from "types/misc";

    type V1 = {
        camera;
    };

    interface Bookmark {
        v1?: {
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
            deviations: {
                index: number;
                mixFactor: number;
            };
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
                planes: { normalOffset: [number, number, number, number]; color: [number, number, number, number] }[];
            };
            grid: {
                enabled: boolean;
                color: [number, number, number];
                origin: [number, number, number];
                axisX: [number, number, number];
                axisY: [number, number, number];
                size1: number;
                size2: number;
                distance: number;
            };
            terrain: {
                asBackground: boolean;
            };
            measurements: {
                area: {
                    points: [point: [number, number, number], normal: [number, number, number]][];
                };
                pointLine: {
                    points: [number, number, number][];
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
                    entities: ExtendedMeasureEntity[];
                };
            };
            followPath:
                | {
                      entities: number[] | ExtendedMeasureEntity[];
                      roadIds: string[];
                      profileNumber: number;
                      currentCenter: [number, number, number];
                  }
                | undefined;
        };
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
}
