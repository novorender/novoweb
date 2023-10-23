import { rotationFromDirection, View } from "@novorender/api";
import { quat, vec3 } from "gl-matrix";

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
