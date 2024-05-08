import { ReadonlyVec2, vec2 } from "gl-matrix";

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
