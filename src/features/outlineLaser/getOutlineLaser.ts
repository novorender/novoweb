import { segmentPlaneIntersection, View } from "@novorender/api";
import { ReadonlyVec3, ReadonlyVec4, vec3 } from "gl-matrix";

export function getOutlineLaser(
    pickPosition: ReadonlyVec3,
    view: View | undefined,
    mode: "clipping" | "outline",
    rotation: number,
    planes: ReadonlyVec4[],
    perpendicularIdx?: number
) {
    if (view) {
        const sp = view.measure?.draw.toMarkerPoints([pickPosition]);
        if (sp && sp.length > 0 && sp[0]) {
            const { renderState } = view;
            const { camera } = renderState;
            const laserPosition =
                mode == "clipping" && camera.kind == "pinhole"
                    ? segmentPlaneIntersection(
                          [camera.position, pickPosition],
                          renderState.clipping.planes[0].normalOffset
                      )
                    : pickPosition;
            if (laserPosition) {
                const planeNormal = vec3.fromValues(planes[0][0], planes[0][1], planes[0][2]);
                const autoAlign = Math.abs(vec3.dot(planeNormal, vec3.fromValues(0, 0, 1))) > 0.5;
                const outlineValues = view.outlineLaser(
                    laserPosition,
                    mode,
                    0,
                    rotation,
                    autoAlign ? "closest" : undefined
                );
                if (outlineValues) {
                    const perpendicularValues =
                        perpendicularIdx !== undefined &&
                        view.outlineLaser(laserPosition, mode, perpendicularIdx, rotation);
                    return {
                        left: outlineValues.left,
                        right: outlineValues.right,
                        down: outlineValues.down,
                        up: outlineValues.up,
                        zUp: perpendicularValues ? perpendicularValues.left : [],
                        zDown: perpendicularValues ? perpendicularValues.right : [],
                        laserPosition: laserPosition,
                        measurementX:
                            outlineValues.left.length > 0 && outlineValues.right.length > 0
                                ? { startIdx: 0, endIdx: 0 }
                                : undefined,
                        measurementY:
                            outlineValues.down.length > 0 && outlineValues.up.length > 0
                                ? { startIdx: 0, endIdx: 0 }
                                : undefined,
                        measurementZ:
                            perpendicularValues &&
                            perpendicularValues.down.length > 0 &&
                            perpendicularValues.up.length > 0
                                ? { startIdx: 0, endIdx: 0 }
                                : undefined,
                        laserPlanes: perpendicularIdx ? planes : [],
                    };
                }
            }
        }
    }
    return undefined;
}

export type OutlineLaser = NonNullable<Awaited<ReturnType<typeof getOutlineLaser>>>;
