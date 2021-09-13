import type { SpeedDialActionProps } from "@material-ui/lab";

import { SpeedDialAction } from "components";
import { config as featuresConfig } from "config/features";
import { selectSelectedObjects, renderActions } from "slices/renderSlice";
import { useAppDispatch, useAppSelector } from "app/store";

type Props = SpeedDialActionProps;

export function ClearSelection(props: Props) {
    const { name, Icon } = featuresConfig["clearSelection"];

    const selectedIds = useAppSelector(selectSelectedObjects);

    const dispatch = useAppDispatch();

    return (
        <SpeedDialAction
            {...props}
            data-test="clear-selection"
            FabProps={{ disabled: !selectedIds.length, ...props.FabProps }}
            onClick={() => dispatch(renderActions.clearSelectedObjects())}
            title={name}
            icon={<Icon />}
        />
    );
}
