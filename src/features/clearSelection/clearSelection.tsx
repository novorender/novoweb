import type { SpeedDialActionProps } from "@mui/material";

import { SpeedDialAction } from "components";
import { featuresConfig } from "config/features";
import { renderActions, selectMainObject } from "features/render";
import { useAppDispatch, useAppSelector } from "app/store";
import { highlightActions, useDispatchHighlighted, useHighlighted } from "contexts/highlighted";
import { highlightCollectionsActions, useDispatchHighlightCollections } from "contexts/highlightCollections";

type Props = SpeedDialActionProps;

export function ClearSelection(props: Props) {
    const { name, Icon } = featuresConfig["clearSelection"];
    const { idArr: highlighted } = useHighlighted();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHighlightCollections = useDispatchHighlightCollections();
    const mainObject = useAppSelector(selectMainObject);

    const selectedIds = mainObject !== undefined ? highlighted.concat(mainObject) : highlighted;

    const dispatch = useAppDispatch();

    const clear = () => {
        dispatchHighlighted(highlightActions.setIds([]));
        dispatchHighlightCollections(highlightCollectionsActions.clearAll());
        dispatch(renderActions.setMainObject(undefined));
    };

    const disabled = !selectedIds.length;

    return (
        <SpeedDialAction
            {...props}
            data-test="clear-selection"
            FabProps={{ disabled, ...props.FabProps }}
            onClick={clear}
            title={disabled ? undefined : name}
            icon={<Icon />}
        />
    );
}
