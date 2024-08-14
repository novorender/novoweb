import { Box, IconButton, type SpeedDialActionProps, Tooltip } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { SpeedDialAction } from "components";
import { featuresConfig } from "config/features";
import { hiddenActions, useDispatchHidden, useHidden } from "contexts/hidden";
import {
    HighlightCollection,
    highlightCollectionsActions,
    useDispatchHighlightCollections,
} from "contexts/highlightCollections";
import { highlightActions, useDispatchHighlighted, useHighlighted } from "contexts/highlighted";
import { selectionBasketActions, useDispatchSelectionBasket } from "contexts/selectionBasket";
import { renderActions, selectMainObject } from "features/render";

type Props = SpeedDialActionProps;

export function HideSelected({ newDesign, ...props }: Props & { newDesign?: boolean }) {
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

    if (newDesign) {
        return (
            <Tooltip title={name} placement="top">
                <Box>
                    <IconButton onClick={toggleHideSelected} disabled={disabled}>
                        <Icon />
                    </IconButton>
                </Box>
            </Tooltip>
        );
    }

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
