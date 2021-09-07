import type { SpeedDialActionProps } from "@material-ui/lab";

import { SpeedDialAction } from "components/speedDialAction";
import { config as featuresConfig } from "config/features";
import { renderActions, selectSelectedObjects, selectHiddenObjects } from "slices/renderSlice";
import { useAppDispatch, useAppSelector } from "app/store";

type Props = SpeedDialActionProps;

export function HideSelected(props: Props) {
    const { name, Icon } = featuresConfig["hideSelected"];
    const selected = useAppSelector(selectSelectedObjects);
    const hidden = useAppSelector(selectHiddenObjects);
    const disabled = !selected.length && !hidden.length;

    const dispatch = useAppDispatch();

    const toggleHideSelected = () => {
        if (selected.length) {
            dispatch(renderActions.hideObjects(selected));
            dispatch(renderActions.clearSelectedObjects());
        } else if (hidden.length) {
            dispatch(renderActions.setHiddenObjects([]));
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
