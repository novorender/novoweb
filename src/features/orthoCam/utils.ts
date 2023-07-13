import { View, rotationFromDirection } from "@novorender/web_app";
import { quat, vec3 } from "gl-matrix";

export function getTopDownParams({ view, elevation }: { view: View; elevation: number | undefined }): {
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
        rotation: rotationFromDirection([0, 0, 1]),
        fov: 100,
    };
}
