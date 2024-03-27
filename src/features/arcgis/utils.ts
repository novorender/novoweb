import { IFeature, Position } from "@esri/arcgis-rest-request";
import { BoundingSphere, RenderState } from "@novorender/api";
import { AABB2 } from "@novorender/api/types/measure/worker/brep";
import { vec2, vec3 } from "gl-matrix";

import { FeatureSymbol, LayerDrawingInfo } from "./arcgisTypes";
import { FeatureGeometry, FeatureServer, Layer, LayerFeature, SelectedFeatureId } from "./types";

export function trimRightSlash(s: string) {
    return s && s.replace(/\/$/, "");
}

type Rect = { x1: number; y1: number; x2: number; y2: number };

function extendRect(rect: Rect, x: number, y: number) {
    if (x < rect.x1) {
        rect.x1 = x;
    } else if (x > rect.x2) {
        rect.x2 = x;
    }

    if (y < rect.y1) {
        rect.y1 = y;
    } else if (y > rect.y2) {
        rect.y2 = y;
    }
}

export function aabb2ToBoundingSphere(aabb: AABB2): BoundingSphere {
    const hw = (aabb.max[0] - aabb.min[0]) / 2;
    const hh = (aabb.max[1] - aabb.min[1]) / 2;

    return {
        center: [aabb.min[0] + hw, aabb.min[1] + hh, 0],
        radius: Math.sqrt(hw * hw + hh * hh),
    };
}

function rectToAabb2(rect: Rect): AABB2 {
    return {
        min: vec2.fromValues(rect.x1, rect.y1),
        max: vec2.fromValues(rect.x2, rect.y2),
    };
}

function aabb2ToRect(aabb: AABB2): Rect {
    return {
        x1: aabb.min[0],
        y1: aabb.min[1],
        x2: aabb.max[0],
        y2: aabb.max[1],
    };
}

export function iFeatureToLayerFeature(drawingInfo: LayerDrawingInfo, feature: IFeature): LayerFeature {
    const { geometry } = feature;
    let newGeometry: FeatureGeometry | undefined = undefined;
    let aabb: AABB2 | undefined;
    const z = 0;

    // We work with ReadonlyVec3 which is compatible with Position,
    // but Position can also be vector of size=2.
    // So we ensure that all positions have size >= 3.
    if (geometry) {
        if ("paths" in geometry) {
            let rect: Rect | undefined = undefined;
            newGeometry = {
                paths: geometry.paths.map((path) =>
                    path.map((pos) => {
                        if (rect) {
                            extendRect(rect, pos[0], pos[1]);
                        } else {
                            rect = { x1: pos[0], y1: pos[1], x2: pos[0], y2: pos[1] };
                        }
                        return vec3.fromValues(pos[0], pos[1], z);
                    })
                ),
            };
            aabb = rect && rectToAabb2(rect);
        } else if ("curvePaths" in geometry) {
            // polyline with curves
        } else if ("rings" in geometry) {
            let rect: Rect | undefined = undefined;
            newGeometry = {
                rings: geometry.rings.map((ring) =>
                    ring.map((pos) => {
                        if (rect) {
                            extendRect(rect, pos[0], pos[1]);
                        } else {
                            rect = { x1: pos[0], y1: pos[1], x2: pos[0], y2: pos[1] };
                        }
                        return vec3.fromValues(pos[0], pos[1], z);
                    })
                ),
            };
            aabb = rect && rectToAabb2(rect);
        } else if ("curveRings" in geometry) {
            // polygon with curves
        } else {
            newGeometry = {
                x: geometry.x,
                y: geometry.y,
                z,
            };
            const p = vec2.fromValues(geometry.x, geometry.y);
            aabb = { min: p, max: p };
        }
    }

    return {
        attributes: feature.attributes,
        geometry: newGeometry,
        aabb,
        computedSymbol: computeFeatureSymbol(drawingInfo, feature),
    };
}

// const DEFAULT_POLYGON_SYMBOL: FeatureSymbol = {
//     type: "esriSFS",
//     style: "esriSFSDiagonalCross",
//     color: [230, 0, 0, 255],
//     outline: {
//         color: [0, 0, 0, 255],
//         width: 1,
//         type: "esriSLS",
//         style: "esriSLSSolid",
//     },
// };

function computeFeatureSymbol(drawingInfo: LayerDrawingInfo, feature: IFeature): FeatureSymbol | undefined {
    if (drawingInfo.renderer.type === "simple") {
        return drawingInfo.renderer.symbol;
    } else if (drawingInfo.renderer.type === "uniqueValue") {
        const fieldValue = feature.attributes[drawingInfo.renderer.field1];
        const matchingStyle = drawingInfo.renderer.uniqueValueInfos.find((info) => info.value === fieldValue);
        if (matchingStyle) {
            return matchingStyle.symbol;
        } else if (drawingInfo.renderer.defaultSymbol) {
            return drawingInfo.renderer.defaultSymbol;
        }
    }

    // if (feature.geometry && "rings" in feature.geometry) {
    //     return DEFAULT_POLYGON_SYMBOL;
    // }
}

export function getTotalAabb2(aabbs: AABB2[]): AABB2 {
    if (aabbs.length === 1) {
        return aabbs[0];
    }

    let rect: Rect | undefined = undefined;

    for (const aabb of aabbs) {
        if (!rect) {
            rect = aabb2ToRect(aabb);
        } else {
            extendRect(rect, aabb.min[0], aabb.min[1]);
            extendRect(rect, aabb.max[0], aabb.max[1]);
        }
    }

    return rectToAabb2(rect!);
}

function isPointInAabb2(aabb: AABB2, p: vec2, sensitivity: number) {
    return (
        p[0] >= aabb.min[0] - sensitivity &&
        p[0] <= aabb.max[0] + sensitivity &&
        p[1] >= aabb.min[1] - sensitivity &&
        p[1] <= aabb.max[1] + sensitivity
    );
}

export function findHitFeatures(pos: vec2, sensitivity: number, features: LayerFeature[]): LayerFeature[] {
    const hits = [];

    for (let i = 0; i < features.length; i++) {
        const feature = features[i];
        const { geometry, aabb } = feature;
        if (!aabb || !geometry || !feature.computedSymbol || !isPointInAabb2(aabb, pos, sensitivity)) {
            continue;
        }

        if ("paths" in geometry) {
            const sqrSensitivity = sensitivity * sensitivity;
            for (const path of geometry.paths) {
                if (hitsPath(pos, sqrSensitivity, path)) {
                    hits.push(feature);
                }
            }
        } else if ("rings" in geometry) {
            for (const ring of geometry.rings) {
                if (hitsPolygon(pos[0], pos[1], ring)) {
                    hits.push(feature);
                }
            }
        } else {
            const sqrSensitivity = sensitivity * sensitivity;
            if (vec2.sqrDist(pos, vec2.fromValues(geometry.x, geometry.y)) <= sqrSensitivity) {
                hits.push(feature);
            }
        }
    }

    return hits;
}

// Based on https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line
// but looks like formula there is for infinite line, not line segment.
// I've added some checks for segment
function hitsPath(v0: vec2, sqrSensitivity: number, path: Position[]) {
    const v1 = vec2.create();
    const v2 = vec2.create();

    for (let i = 0; i < path.length - 1; i++) {
        vec2.set(v1, path[i][0], path[i][1]);

        // Close to first point, only check for the first segment
        if (i === 0 && vec2.sqrDist(v0, v1) <= sqrSensitivity) {
            return true;
        }

        vec2.set(v2, path[i + 1][0], path[i + 1][1]);

        // Close to second point
        if (vec2.sqrDist(v0, v2) <= sqrSensitivity) {
            return true;
        }

        // Is in line segment reach
        const maxSqrDistance = vec2.sqrDist(v1, v2) + sqrSensitivity;
        if (vec2.sqrDist(v0, v1) > maxSqrDistance || vec2.sqrDist(v0, v2) > maxSqrDistance) {
            continue;
        }

        // Is close to line segment
        const distance = pointToLineSegmentDistance(v0[0], v0[1], v1[0], v1[1], v2[0], v2[1]);
        if (distance * distance <= sqrSensitivity) {
            return true;
        }
    }

    return false;
}

function pointToLineSegmentDistance(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number) {
    const xd = x2 - x1;
    const yd = y2 - y1;
    if (xd === 0 && yd === 0) {
        return Number.MAX_SAFE_INTEGER;
    }
    return Math.abs((x2 - x1) * (y1 - y0) - (x1 - x0) * (y2 - y1)) / Math.sqrt(xd * xd + yd * yd);
}

// Based on https://observablehq.com/@tmcw/understanding-point-in-polygon
function hitsPolygon(x: number, y: number, polygon: Position[]) {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0],
            yi = polygon[i][1];
        const xj = polygon[j][0],
            yj = polygon[j][1];

        const intersect = yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect) {
            inside = !inside;
        }
    }

    return inside;
}

export function makeWhereStatement(fs: FeatureServer, layer: Layer) {
    return [fs.layerWhere, layer.where].filter((s) => s).join(" AND ");
}

export function areArraysEqual<T>(a1: T[] | undefined, a2: T[] | undefined) {
    return (!a1 && !a2) || a1 === a2 || (a1 && a2 && a1.length === a2.length && a1.every((e, i) => e === a2[i]));
}

export function doAabb2Intersect(a: AABB2, b: AABB2) {
    return a.min[0] < b.max[0] && b.min[0] < a.max[0] && a.min[1] < b.max[1] && b.min[1] < a.max[1];
}

export function getAabb2MaxSize(aabb2: AABB2) {
    return Math.max(aabb2.max[0] - aabb2.min[0], aabb2.max[1] - aabb2.min[1]);
}

export function getOrthoCameraExtent(renderState: RenderState): AABB2 {
    const {
        camera,
        output: { width, height },
    } = renderState;
    const h = camera.fov;
    const hh = h / 2;
    const w = h * (width / height);
    const hw = w / 2;

    return {
        min: [camera.position[0] - hw, camera.position[1] - hh],
        max: [camera.position[0] + hw, camera.position[1] + hh],
    };
}

// From https://stackoverflow.com/a/16245768/915663
export function b64toBlob(b64Data: string, contentType = "", sliceSize = 512) {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);

        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }

    const blob = new Blob(byteArrays, { type: contentType });
    return blob;
}

export function areSelectedFeatureIdsEqual(a: SelectedFeatureId, b: SelectedFeatureId) {
    return (
        (!a && !b) ||
        (a && b && a.featureServerId === b.featureServerId && a.layerId === b.layerId && a.featureId === b.featureId)
    );
}
