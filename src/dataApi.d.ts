declare module "@novorender/data-js-api" {
    import { vec3 } from "gl-matrix";

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
    }
}
