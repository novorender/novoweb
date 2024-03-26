import { computeRotation, rotationFromDirection } from "@novorender/api";
import { SceneData, SceneLoadFail } from "@novorender/data-js-api";
import { GeoLocation, Internal } from "@novorender/webgl-api";
import { quat, vec3, vec4 } from "gl-matrix";

import { dataApi } from "apis/dataV1";
import { CustomProperties } from "types/project";

import { CadCamera, SceneConfig, Subtrees, SubtreeStatus } from "./types";

export function getSubtrees(
    hidden: NonNullable<CustomProperties["explorerProjectState"]>["renderSettings"]["hide"],
    subtrees: string[]
): Subtrees {
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

export function getLegacySubtrees(settings: Internal.RenderSettingsExt["advanced"], subtrees: string[]): Subtrees {
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

export async function loadScene(id: string): Promise<[SceneConfig, CadCamera | undefined]> {
    const res: (SceneData & { version?: string }) | SceneLoadFail = await dataApi.loadScene(id);
    let camera: CadCamera | undefined = undefined;

    if ("error" in res) {
        throw res;
    }

    const { ..._cfg } = res;
    const cfg = _cfg as SceneConfig;

    // Legacy scene config format
    // needs to be flipped.
    if (!cfg.customProperties?.initialCameraState) {
        if (cfg.camera && (cfg.camera.kind === "ortho" || cfg.camera.kind === "flight")) {
            camera =
                cfg.camera.kind === "ortho"
                    ? {
                          kind: "orthographic",
                          position: flip([
                              cfg.camera.referenceCoordSys[12],
                              cfg.camera.referenceCoordSys[13],
                              cfg.camera.referenceCoordSys[14],
                          ]),
                          rotation: rotationFromDirection(
                              flip([
                                  cfg.camera.referenceCoordSys[8],
                                  cfg.camera.referenceCoordSys[9],
                                  cfg.camera.referenceCoordSys[10],
                              ])
                          ),
                          fov: cfg.camera.fieldOfView,
                      }
                    : {
                          kind: "pinhole",
                          position: flip(cfg.camera.position),
                          rotation: computeRotation(0, cfg.camera.pitch, cfg.camera.yaw),
                          fov: cfg.camera.fieldOfView,
                      };
        }
    } else {
        camera = cfg.customProperties.initialCameraState;
    }

    if (!cfg.customProperties.explorerProjectState && cfg.settings && cfg.settings.background) {
        cfg.settings.background.color = getBackgroundColor(cfg.settings.background.color);
    }

    return [cfg, camera];
}

function getBackgroundColor(color: vec4 | undefined): vec4 {
    const grey: vec4 = [0.75, 0.75, 0.75, 1];
    const legacyBlue: vec4 = [0, 0, 0.25, 1];

    if (!color || vec4.exactEquals(color, legacyBlue)) {
        return grey;
    }

    return color;
}
