import type { SpeedDialActionProps } from "@mui/material";

import { SpeedDialAction } from "components";
import { featuresConfig } from "config/features";
import { renderActions, selectMainObject } from "features/render/renderSlice";
import { useAppDispatch, useAppSelector } from "app/store";
import { highlightActions, useDispatchHighlighted, useHighlighted } from "contexts/highlighted";
import { hiddenActions, useDispatchHidden, useHidden } from "contexts/hidden";
import { useDispatchSelectionBasket, selectionBasketActions } from "contexts/selectionBasket";
import {
    HighlightCollection,
    highlightCollectionsActions,
    useDispatchHighlightCollections,
} from "contexts/highlightCollections";

type Props = SpeedDialActionProps;

export function HideSelected(props: Props) {
    const { name, Icon } = featuresConfig["hideSelected"];
    const mainObject = useAppSelector(selectMainObject);

    const { idArr: highlighted } = useHighlighted();
    const { idArr: hidden } = useHidden();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHighlightCollections = useDispatchHighlightCollections();
    const dispatchHidden = useDispatchHidden();
    const dispatchSelectionBasket = useDispatchSelectionBasket();

    const selected = mainObject !== undefined ? highlighted.concat(mainObject) : highlighted;
    const disabled = !selected.length && !hidden.length;

    const dispatch = useAppDispatch();

    const toggleHideSelected = () => {
        if (selected.length) {
            dispatchHidden(hiddenActions.add(selected));

            dispatch(renderActions.setMainObject(undefined));
            dispatchHighlighted(highlightActions.setIds([]));
            dispatchHighlightCollections(
                highlightCollectionsActions.setIds(HighlightCollection.SecondaryHighlight, [])
            );
            dispatchSelectionBasket(selectionBasketActions.remove(selected));
        } else if (hidden.length) {
            dispatchHidden(hiddenActions.setIds([]));
        }
    };

    return (
        <SpeedDialAction
            {...props}
            data-test="hide-selected"
            FabProps={{ disabled, ...props.FabProps }}
            onClick={toggleHideSelected}
            title={disabled ? undefined : name}
            icon={<Icon />}
        />
    );
}
