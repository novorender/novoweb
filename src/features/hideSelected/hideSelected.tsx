import type { SpeedDialActionProps } from "@mui/material";

import { SpeedDialAction } from "components";
import { featuresConfig } from "config/features";
import { renderActions, selectMainObject } from "slices/renderSlice";
import { useAppDispatch, useAppSelector } from "app/store";
import { highlightActions, useDispatchHighlighted, useHighlighted } from "contexts/highlighted";
import { hiddenGroupActions, useDispatchHidden, useHidden } from "contexts/hidden";
import { useDispatchVisible, visibleActions } from "contexts/visible";

type Props = SpeedDialActionProps;

export function HideSelected(props: Props) {
    const { name, Icon } = featuresConfig["hideSelected"];
    const mainObject = useAppSelector(selectMainObject);

    const { idArr: highlighted } = useHighlighted();
    const { idArr: hidden } = useHidden();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHidden = useDispatchHidden();
    const dispatchVisible = useDispatchVisible();

    const selected = mainObject !== undefined ? highlighted.concat(mainObject) : highlighted;
    const disabled = !selected.length && !hidden.length;

    const dispatch = useAppDispatch();

    const toggleHideSelected = () => {
        if (selected.length) {
            dispatchHidden(hiddenGroupActions.add(selected));

            dispatch(renderActions.setMainObject(undefined));
            dispatchHighlighted(highlightActions.setIds([]));
            dispatchVisible(visibleActions.remove(selected));
        } else if (hidden.length) {
            dispatchHidden(hiddenGroupActions.setIds([]));
        }
    };

    return (
        <SpeedDialAction
            {...props}
            data-test="hide-selected"
            FabProps={{ disabled, ...props.FabProps }}
            onClick={toggleHideSelected}
            title={name}
            icon={<Icon />}
        />
    );
}
