import type { SpeedDialActionProps } from "@mui/material";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { SpeedDialAction } from "components";
import { featuresConfig } from "config/features";
import { highlightCollectionsActions, useDispatchHighlightCollections } from "contexts/highlightCollections";
import { highlightActions, useDispatchHighlighted, useHighlighted } from "contexts/highlighted";
import { renderActions, selectMainObject } from "features/render";

type Props = SpeedDialActionProps;

export function ClearSelection(props: Props) {
    const { nameKey, Icon } = featuresConfig["clearSelection"];
    const { t } = useTranslation();
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
            title={disabled ? undefined : t(nameKey)}
            icon={<Icon />}
        />
    );
}
