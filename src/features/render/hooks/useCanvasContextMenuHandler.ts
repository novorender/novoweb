import { vec2, vec3 } from "gl-matrix";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { selectCanvasContextMenuFeatures } from "slices/explorerSlice";
import { isRealVec } from "utils/misc";

import { Picker, renderActions, selectPicker, StampKind } from "../renderSlice";

export function useCanvasContextMenuHandler() {
    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();
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
            dispatch(renderActions.setStamp(null));
            return;
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
