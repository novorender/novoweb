import { OrthoControllerParams, View } from "@novorender/webgl-api";
import { vec3 } from "gl-matrix";

import { api } from "app";

export function getTopDownParams({ view, canvas }: { view: View; canvas: HTMLCanvasElement }): OrthoControllerParams {
    const bs = view.scene?.boundingSphere;
    const maxY = bs ? bs.center[1] + bs?.radius : 10000;
    const orthoController = api.createCameraController({ kind: "ortho" }, canvas);
    const pos = vec3.copy(vec3.create(), view.camera.position);
    pos[1] = Math.min(pos[1], maxY);
    (orthoController as any).init(pos, [0, 1, 0], view.camera);
    const mat = (orthoController.params as any).referenceCoordSys;

    return {
        kind: "ortho",
        referenceCoordSys: mat,
        fieldOfView: 100,
        near: -0.001,
        far: (view.camera.controller.params as any).far,
    };
}
