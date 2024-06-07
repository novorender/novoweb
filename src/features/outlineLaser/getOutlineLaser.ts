import { segmentPlaneIntersection, View } from "@novorender/api";
import { ReadonlyVec3 } from "gl-matrix";

export function getOutlineLaser(pickPosition: ReadonlyVec3, view: View | undefined) {
    if (view) {
        const sp = view.measure?.draw.toMarkerPoints([pickPosition]);
        if (sp && sp.length > 0 && sp[0]) {
            const { renderState } = view;
            const { camera } = renderState;
            const laserPosition =
                camera.kind == "pinhole"
                    ? segmentPlaneIntersection(
                          [camera.position, pickPosition],
                          renderState.clipping.planes[0].normalOffset
                      )
                    : pickPosition;
            if (laserPosition) {
                const outlineValues = view.outlineLaser(laserPosition, "clipping", 0);
                if (outlineValues) {
                    return {
                        left: outlineValues.left,
                        right: outlineValues.right,
                        down: outlineValues.down,
                        up: outlineValues.up,
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
    }
    return undefined;
}

export type OutlineLaser = NonNullable<Awaited<ReturnType<typeof getOutlineLaser>>>;
