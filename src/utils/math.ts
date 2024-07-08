import { AABB2 } from "@novorender/api/types/measure/worker/brep";
import { ReadonlyVec2, ReadonlyVec3, ReadonlyVec4, vec2, vec3 } from "gl-matrix";

/**
 * Project point on a line segment.
 * E.g. here we project point C on line segment AB and D is the result.
 *    C
 *    |
 * A--D-----B
 * @param out output point
 * @param p point
 * @param l1 first line segment point
 * @param l2 second line segment point
 * @returns point or (if outside the segment) undefined
 */
export function projectPointOnLineSegment2D(
    out: vec2,
    p: ReadonlyVec2,
    l1: ReadonlyVec2,
    l2: ReadonlyVec2
): vec2 | undefined {
    const lVec = vec2.sub(vec2.create(), l1, l2);
    const pVec = vec2.sub(vec2.create(), l1, p);
    const offset = (vec2.len(lVec) * vec2.dot(lVec, pVec)) / vec2.dot(lVec, lVec);
    const k = offset / vec2.len(lVec);
    if (k < 0 || k > 1) {
        return;
    }
    return vec2.lerp(out, l1, l2, k);
}

export function radToDeg(radian: number) {
    return (radian / Math.PI) * 180;
}

export function pointToPlaneDistance(p: ReadonlyVec3, normalOffset: ReadonlyVec4) {
    const [x0, y0, z0] = p;
    const [a, b, c] = normalOffset;
    const d = -normalOffset[3];
    return Math.abs(a * x0 + b * y0 + c * z0 + d) / Math.sqrt(a * a + b * b + c * c);
}

export function pointToRectDistance(point: ReadonlyVec2, rect: AABB2) {
    if (point[0] >= rect.min[0] && point[0] <= rect.max[0] && point[1] >= rect.min[1] && point[1] <= rect.max[1]) {
        return 0;
    }

    if (point[0] >= rect.min[0] && point[0] < rect.max[0]) {
        return point[1] < rect.min[1] ? rect.min[1] - point[1] : point[1] - rect.max[1];
    }

    if (point[1] >= rect.min[1] && point[1] < rect.max[1]) {
        return point[0] < rect.min[0] ? rect.min[0] - point[0] : point[0] - rect.max[0];
    }

    if (point[0] < rect.min[0]) {
        if (point[1] < rect.min[1]) {
            return vec2.dist(point, rect.min);
        } else {
            return vec2.dist(point, vec2.fromValues(rect.min[0], rect.max[1]));
        }
    } else {
        if (point[1] < rect.min[1]) {
            return vec2.dist(point, vec2.fromValues(rect.max[0], rect.min[1]));
        } else {
            return vec2.dist(point, rect.max);
        }
    }
}

export function isRectInsideCircle(rect: AABB2, center: ReadonlyVec2, radius: number) {
    return [
        rect.min,
        vec2.fromValues(rect.min[0], rect.max[1]),
        vec2.fromValues(rect.max[0], rect.min[1]),
        rect.max,
    ].every((p) => vec2.dist(center, p) <= radius);
}

export function getPerpendicular(normal: ReadonlyVec3) {
    // Choose a vector that is not parallel to the normal vector
    let v = vec3.fromValues(0, 0, 1);
    if (Math.abs(vec3.dot(v, normal)) > 0.98) {
        v = vec3.fromValues(0, 1, 0);
    }
    // Compute a vector that is perpendicular to both normal and v
    const perpendicularVector = vec3.cross(vec3.create(), normal, v);
    // Normalize the perpendicular vector
    return vec3.normalize(perpendicularVector, perpendicularVector);
}
