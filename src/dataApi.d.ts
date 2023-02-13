declare module "@novorender/data-js-api" {
    import { vec3 } from "gl-matrix";
    import { MeasureSettings } from "@novorender/measure-api";
    import { ExtendedMeasureEntity } from "types/misc";

    interface Bookmark {
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
    }
}
