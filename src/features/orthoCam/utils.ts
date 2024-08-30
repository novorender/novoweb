import { rotationFromDirection, View } from "@novorender/api";
import { quat, ReadonlyVec3, vec3 } from "gl-matrix";

export function getTopDownParams({
    view,
    elevation,
    snapToNearestAxis,
}: {
    view: View;
    elevation: number | undefined;
    snapToNearestAxis?: boolean;
}): {
    position: vec3;
    rotation: quat;
    fov: number;
} {
    const position = vec3.clone(view.renderState.camera.position);
    const bs = view.renderState.scene?.config.boundingSphere;
    const maxY = bs ? bs.center[1] + bs.radius : 10000;

    position[2] = elevation ?? Math.min(position[2], maxY);

    return {
        position,
        rotation: rotationFromDirection([0, 0, 1], snapToNearestAxis ? view.renderState.camera.rotation : undefined),
        fov: 100,
    };
}

export function getSnapToPlaneParams({
    planeIdx,
    view,
    anchorPos,
    offset,
}: {
    planeIdx: number;
    view: View;
    anchorPos?: ReadonlyVec3;
    offset?: number;
}): {
    position: vec3;
    rotation: quat;
    fov: number;
    far: number;
} {
    const p = view.renderState.clipping.planes[planeIdx].normalOffset;
    const dir = vec3.fromValues(p[0], p[1], p[2]);
    const rotation = rotationFromDirection(dir);
    let position: ReadonlyVec3;
    if (anchorPos) {
        position = vec3.clone(anchorPos);
        if (offset) {
            vec3.scaleAndAdd(position, position, dir, offset);
        }
    } else {
        const planePoint = vec3.scaleAndAdd(vec3.create(), vec3.create(), dir, p[3]);
        const v = vec3.sub(vec3.create(), view.renderState.camera.position, planePoint);
        const d = vec3.dot(v, dir);
        position = vec3.scaleAndAdd(vec3.create(), view.renderState.camera.position, dir, -d);
    }
    return { position, rotation, fov: view.renderState.camera.fov, far: 0.001 };
}
