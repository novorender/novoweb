import { View } from "@novorender/api";
import { ReadonlyVec3, ReadonlyVec4 } from "gl-matrix";

import { CameraType } from "features/render";

export async function getOutlineLaser(
    laserPosition: ReadonlyVec3,
    view: View | undefined,
    cameraType: CameraType,
    plane: ReadonlyVec4
) {
    if (view) {
        const measureView = await view.measure;

        const sp = measureView.draw.toMarkerPoints([laserPosition]);
        if (sp && sp.length > 0 && sp[0]) {
            const outlineValues = await view.outlineLaser(
                sp[0],
                cameraType === CameraType.Orthographic ? undefined : { laserPosition3d: laserPosition, plane }
            );
            if (outlineValues) {
                return {
                    left: outlineValues.left.map((p) => p.position),
                    right: outlineValues.right.map((p) => p.position),
                    down: outlineValues.down.map((p) => p.position),
                    up: outlineValues.up.map((p) => p.position),
                    laserPosition: laserPosition,
                    measurementX:
                        outlineValues.left.length > 0 && outlineValues.right.length > 0
                            ? { startIdx: 0, endIdx: 0 }
                            : undefined,
                    measurementY:
                        outlineValues.down.length > 0 && outlineValues.up.length > 0
                            ? { startIdx: 0, endIdx: 0 }
                            : undefined,
                };
            }
        }
    }
    return undefined;
}
