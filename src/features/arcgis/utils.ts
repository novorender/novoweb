import { IFeature, Position } from "@esri/arcgis-rest-request";
import { BoundingSphere, RenderStateCamera } from "@novorender/api";
import { AABB2 } from "@novorender/api/types/measure/worker/brep";
import { vec2 } from "gl-matrix";

import { getCameraState } from "features/engine2D";

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

export function computeFeatureAabb(feature: IFeature): AABB2 | undefined {
    if (!feature.geometry) {
        return;
    }

    if ("paths" in feature.geometry) {
        // polyline
        let rect: Rect | undefined = undefined;
        for (const path of feature.geometry.paths) {
            for (const pos of path) {
                if (rect) {
                    extendRect(rect, pos[0], pos[1]);
                } else {
                    rect = { x1: pos[0], y1: pos[1], x2: pos[0], y2: pos[1] };
                }
            }
        }
        return rect && rectToAabb2(rect);
    } else if ("curvePaths" in feature.geometry) {
        // polyline with curves
    } else if ("rings" in feature.geometry) {
        // polygon
        let rect: Rect | undefined = undefined;
        for (const path of feature.geometry.rings) {
            for (const pos of path) {
                if (rect) {
                    extendRect(rect, pos[0], pos[1]);
                } else {
                    rect = { x1: pos[0], y1: pos[1], x2: pos[0], y2: pos[1] };
                }
            }
        }
        return rect && rectToAabb2(rect);
    } else if ("curveRings" in feature.geometry) {
        // polygon with curves
    } else {
        // point
        const v = vec2.fromValues(feature.geometry.x, feature.geometry.y);
        return {
            min: v,
            max: v,
        };
    }
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

export function findHitFeatureIndex(
    pos: vec2,
    sensitivity: number,
    features: IFeature[],
    featuresAabb: (AABB2 | undefined)[]
): number {
    for (let i = 0; i < features.length; i++) {
        const geometry = features[i].geometry;
        const aabb = featuresAabb[i];
        if (!aabb || !geometry || !isPointInAabb2(aabb, pos, sensitivity)) {
            continue;
        }

        if ("paths" in geometry) {
            const sqrSensitivity = sensitivity * sensitivity;
            for (const path of geometry.paths) {
                if (hitsPath(pos, sqrSensitivity, path)) {
                    return i;
                }
            }
        } else if ("rings" in geometry) {
            for (const ring of geometry.rings) {
                if (hitsPolygon(pos[0], pos[1], ring)) {
                    return i;
                }
            }
        } else if ("curvePaths" in geometry) {
            // not supported
        } else if ("curveRings" in geometry) {
            // not supported
        } else {
            const sqrSensitivity = sensitivity * sensitivity;
            if (vec2.sqrDist(pos, vec2.fromValues(geometry.x, geometry.y)) <= sqrSensitivity) {
                return i;
            }
        }
    }

    return -1;
}

// Based on https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line
// but looks like formula there is for infinite line, not line segment.
// I've added some checks for segment
function hitsPath(v0: vec2, sqrSensitivity: number, path: Position[]) {
    const v1 = vec2.create();
    const v2 = vec2.create();

    for (let i = 0; i < path.length - 1; i++) {
        // Close to first point
        vec2.set(v1, path[i][0], path[i][1]);
        if (vec2.sqrDist(v0, v1) <= sqrSensitivity) {
            return true;
        }

        // Close to second point
        vec2.set(v2, path[i + 1][0], path[i + 1][1]);
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
        if (distance <= sqrSensitivity) {
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

export function isSuitableCameraForArcgis(camera: RenderStateCamera | undefined) {
    if (!camera || camera.kind !== "orthographic") {
        return false;
    }

    const state = getCameraState(camera);
    return state.dir[2] === -1;
}
