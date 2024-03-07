import { vec2, vec3 } from "gl-matrix";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { selectCanvasContextMenuFeatures } from "slices/explorerSlice";
import { isRealVec } from "utils/misc";

import { renderActions, selectCameraType, selectClippingPlanes, selectPicker } from "../renderSlice";
import { CameraType, Picker, StampKind } from "../types";

export function useCanvasContextMenuHandler() {
    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();
    const cameraType = useAppSelector(selectCameraType);
    const clippingPlanes = useAppSelector(selectClippingPlanes);
    const features = useAppSelector(selectCanvasContextMenuFeatures);
    const picker = useAppSelector(selectPicker);
    const {
        state: { view },
    } = useExplorerGlobals();

    const handleContextMenu = async (pos: vec2, isTouch: boolean) => {
        if (!view || picker !== Picker.Object || !features.length) {
            return;
        }

        const result = await view.pick(pos[0], pos[1], { sampleDiscRadius: isTouch ? 8 : 4 });

        if (!result || result.objectId === -1) {
            if (cameraType === CameraType.Orthographic && clippingPlanes.planes.length) {
                dispatch(
                    renderActions.setStamp({
                        kind: StampKind.CanvasContextMenu,
                        data: {
                            object: result?.objectId ?? undefined,
                            position: result?.position ?? undefined,
                            normal: result?.normal && isRealVec(result.normal) ? [...result.normal] : undefined,
                        },
                        pinned: true,
                        mouseX: pos[0],
                        mouseY: pos[1],
                    })
                );

                return;
            } else {
                dispatch(renderActions.setStamp(null));
                return;
            }
        }

        dispatch(renderActions.setMainObject(result.objectId));
        dispatchHighlighted(highlightActions.setIds([result.objectId]));
        dispatch(
            renderActions.setStamp({
                kind: StampKind.CanvasContextMenu,
                data: {
                    object: result.objectId,
                    position: [...result.position] as vec3,
                    normal: isRealVec(result.normal) ? [...result.normal] : undefined,
                },
                pinned: true,
                mouseX: pos[0],
                mouseY: pos[1],
            })
        );
    };

    return handleContextMenu;
}
