import { vec3 } from "gl-matrix";
import { useEffect } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { getCameraDir } from "features/engine2D/utils";
import { selectClippingPlanes, selectTerrain } from "features/render";

const transparentColor = [0, 0, 0, 0] as const;

export function useHandleClipping() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const clipping = useAppSelector(selectClippingPlanes);
    const terrain = useAppSelector(selectTerrain);

    useEffect(() => {
        if (!view) {
            return;
        }

        const cameraDir = getCameraDir(view.renderState.camera.rotation);
        const isOrtho = view.renderState.camera.kind === "orthographic";

        view.modifyRenderState({
            clipping: {
                ...clipping,
                draw: true,
                planes: clipping.planes.map(({ baseW: _baseW, ...plane }) => {
                    // If plane is parallel to camera in ortho mode - we'll just see whole screen tinted with plane color,
                    // which doesn't really bring any value, so turn off plane color in this case
                    const isParallelToCamera =
                        isOrtho &&
                        Math.abs(
                            vec3.dot(
                                cameraDir,
                                vec3.fromValues(plane.normalOffset[0], plane.normalOffset[1], plane.normalOffset[2]),
                            ),
                        ) > 0.999;

                    return {
                        ...plane,
                        color: isParallelToCamera || !plane.showPlane ? transparentColor : plane.color,
                        outline: {
                            enabled: clipping.outlines ? plane.outline.enabled : false,
                            lineColor: plane.outline.color,
                        },
                    };
                }),
            },
            terrain: { asBackground: clipping.planes.some((p) => p.showPlane) ? false : terrain.asBackground },
        });
    }, [view, clipping, terrain]);
}
