import type { SpeedDialActionProps } from "@material-ui/lab";

import { SpeedDialAction } from "components";
import { config as featuresConfig } from "config/features";
import { renderActions, selectMainObject } from "slices/renderSlice";
import { useAppDispatch, useAppSelector } from "app/store";
import { highlightActions, useDispatchHighlighted, useHighlighted } from "contexts/highlighted";

type Props = SpeedDialActionProps;

export function ClearSelection(props: Props) {
    const { name, Icon } = featuresConfig["clearSelection"];
    const { ids: highlighted } = useHighlighted();
    const dispatchHighlighted = useDispatchHighlighted();
    const mainObject = useAppSelector(selectMainObject);

    const selectedIds = mainObject !== undefined ? highlighted.concat(mainObject) : highlighted;

    const dispatch = useAppDispatch();

    const clear = () => {
        dispatchHighlighted(highlightActions.setIds([]));
        dispatch(renderActions.setMainObject(undefined));
    };

    return (
        <SpeedDialAction
            {...props}
            data-test="clear-selection"
            FabProps={{ disabled: !selectedIds.length, ...props.FabProps }}
            onClick={clear}
            title={name}
            icon={<Icon />}
        />
    );
}
