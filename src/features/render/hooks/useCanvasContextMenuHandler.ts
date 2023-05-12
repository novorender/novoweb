import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { selectCanvasContextMenuFeatures } from "slices/explorerSlice";
import { isRealVec } from "utils/misc";

import { Picker, StampKind, renderActions, selectPicker } from "../renderSlice";

export function useCanvasContextMenuHandler() {
    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();
    const features = useAppSelector(selectCanvasContextMenuFeatures);
    const picker = useAppSelector(selectPicker);
    const {
        state: { view },
    } = useExplorerGlobals();

    const handleContextMenu = async (pos: Vec2) => {
        if (!view || picker !== Picker.Object || !features.length) {
            return;
        }

        const result = await view.lastRenderOutput?.pick(pos[0], pos[1]);

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
                    position: [...result.position] as Vec3,
                    normal: isRealVec([...result.normal]) ? ([...result.normal] as Vec3) : undefined,
                },
                pinned: true,
                mouseX: pos[0],
                mouseY: pos[1],
            })
        );
    };

    return handleContextMenu;
}
