import { GeoLocation, Internal } from "@novorender/webgl-api";
import { quat, vec3 } from "gl-matrix";

import { dataApi } from "app";
import { RenderState, SubtreeStatus } from "features/render/renderSlice";
import { CustomProperties } from "types/project";

export function getSubtrees(
    hidden: NonNullable<CustomProperties["explorerProjectState"]>["renderSettings"]["hide"],
    subtrees: string[]
): NonNullable<RenderState["subtrees"]> {
    return {
        terrain: subtrees.includes("terrain")
            ? hidden.terrain
                ? SubtreeStatus.Hidden
                : SubtreeStatus.Shown
            : SubtreeStatus.Unavailable,
        lines: subtrees.includes("lines")
            ? hidden.lines
                ? SubtreeStatus.Hidden
                : SubtreeStatus.Shown
            : SubtreeStatus.Unavailable,
        points: subtrees.includes("points")
            ? hidden.points
                ? SubtreeStatus.Hidden
                : SubtreeStatus.Shown
            : SubtreeStatus.Unavailable,
        triangles: subtrees.includes("triangles")
            ? hidden.triangles
                ? SubtreeStatus.Hidden
                : SubtreeStatus.Shown
            : SubtreeStatus.Unavailable,
        documents: subtrees.includes("documents")
            ? hidden.documents
                ? SubtreeStatus.Hidden
                : SubtreeStatus.Shown
            : SubtreeStatus.Unavailable,
    };
}

export function getLegacySubtrees(
    settings: Internal.RenderSettingsExt["advanced"],
    subtrees: string[]
): NonNullable<RenderState["subtrees"]> {
    return {
        terrain: subtrees.includes("terrain")
            ? settings.hideTerrain
                ? SubtreeStatus.Hidden
                : SubtreeStatus.Shown
            : SubtreeStatus.Unavailable,
        lines: subtrees.includes("lines")
            ? settings.hideLines
                ? SubtreeStatus.Hidden
                : SubtreeStatus.Shown
            : SubtreeStatus.Unavailable,
        points: subtrees.includes("points")
            ? settings.hidePoints
                ? SubtreeStatus.Hidden
                : SubtreeStatus.Shown
            : SubtreeStatus.Unavailable,
        triangles: subtrees.includes("triangles")
            ? settings.hideTriangles
                ? SubtreeStatus.Hidden
                : SubtreeStatus.Shown
            : SubtreeStatus.Unavailable,
        documents: subtrees.includes("documents")
            ? settings.hideDocuments
                ? SubtreeStatus.Hidden
                : SubtreeStatus.Shown
            : SubtreeStatus.Unavailable,
    };
}
export function flip<T extends number[]>(v: T): T {
    const flipped = [...v];
    flipped[1] = -v[2];
    flipped[2] = v[1];
    return flipped as T;
}

export function flipGLtoCadQuat(b: quat) {
    const ax = 0.7071067811865475;
    const aw = 0.7071067811865475;
    const bx = b[0];
    const by = b[1];
    const bz = b[2];
    const bw = b[3];

    // prettier-ignore
    return quat.fromValues(
        ax * bw + aw * bx,
        aw * by + - ax * bz,
        aw * bz + ax * by,
        aw * bw - ax * bx);
}

export function isGlSpace(up: Vec3 | undefined) {
    return !vec3.equals(up ?? [0, 1, 0], [0, 0, 1]);
}

export function latLon2Tm({ coords, tmZone }: { coords: GeoLocation; tmZone: string }) {
    return flip(dataApi.latLon2tm(coords, tmZone));
}
