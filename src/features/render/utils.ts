import { computeRotation, rotationFromDirection, SnapTolerance } from "@novorender/api";
import { SceneData, SceneLoadFail } from "@novorender/data-js-api";
import { GeoLocation, Internal } from "@novorender/webgl-api";
import { quat, ReadonlyVec3, vec3, vec4 } from "gl-matrix";

import { dataApi } from "apis/dataV1";
import { CustomProperties } from "types/project";

import { CadCamera, SceneConfig, Subtrees, SubtreeStatus } from "./types";

export function getSubtrees(
    hidden: NonNullable<NonNullable<CustomProperties["explorerProjectState"]>["renderSettings"]>["hide"],
    subtrees: string[],
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

export function flipBack<T extends number[]>(v: T): T {
    const flipped = [...v];
    flipped[1] = v[2];
    flipped[2] = -v[1];
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

export function tm2LatLon({ coords, tmZone }: { coords: ReadonlyVec3; tmZone: string }) {
    return dataApi.tm2LatLon(flipBack(coords), tmZone);
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
                              ]),
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

export function applyCameraDistanceToMeasureTolerance(
    position: ReadonlyVec3,
    cameraPos: ReadonlyVec3,
    settings: SnapTolerance,
): SnapTolerance {
    const newObjectThreshold = vec3.dist(position, cameraPos);
    const hoverScale = Math.min(Math.max(newObjectThreshold, 0.15), 100);

    return {
        edge: settings.edge ? settings.edge * hoverScale : undefined,
        face: settings.face ? settings.face * hoverScale : undefined,
        point: settings.point ? settings.point * hoverScale : undefined,
        segment: settings.segment ? settings.segment * hoverScale : undefined,
    };
}

export function getDefaultCamera(boundingBox?: [number, number, number, number]): CadCamera | undefined {
    if (!boundingBox) {
        return;
    }

    const centerX = (boundingBox[0] + boundingBox[2]) / 2;
    const centerY = (boundingBox[1] + boundingBox[3]) / 2;
    const width = boundingBox[2] - boundingBox[0];
    const height = boundingBox[3] - boundingBox[1];

    const fov = 60;
    const maxDim = Math.max(width, height);
    const distance = maxDim / (2 * Math.tan((fov * Math.PI) / 360));

    const initPosition = vec3.fromValues(0, 0, distance);
    const rotation = quat.fromValues(0.25000000000000006, 0.43301270189221935, 0.07945931129894554, 0.8623724356957945);
    const rotatedPosition = vec3.transformQuat(vec3.create(), initPosition, rotation);
    const position = vec3.fromValues(rotatedPosition[0] + centerX, rotatedPosition[1] + centerY, rotatedPosition[2]);

    return {
        kind: "pinhole",
        position,
        rotation,
        fov,
    };
}

export function getLocalRotationAroundNormal(quaternion: quat, normal: vec3): number {
    // Create a vector to represent the rotation axis
    const rotationAxis = vec3.create();
    quat.getAxisAngle(rotationAxis, quaternion);
    if (Math.abs(vec3.dot(rotationAxis, normal)) < 0.01) {
        return 0;
    }
    // Get the angle between the rotation axis and the normal
    const angle = vec3.angle(rotationAxis, normal);
    // Create a quaternion representing the rotation around the normal
    const rotationQuaternion = quat.setAxisAngle(quat.create(), normal, angle);
    // Decompose the object's quaternion into rotation around the normal and the remaining rotation
    const conjugateRotationQuaternion = quat.conjugate(quat.create(), rotationQuaternion);
    const localRotationQuaternion = quat.multiply(quat.create(), quaternion, conjugateRotationQuaternion);
    // Get the angle of the local rotation around the normal
    const localRotationAngle = 2 * Math.acos(localRotationQuaternion[3]);
    return localRotationAngle;
}
