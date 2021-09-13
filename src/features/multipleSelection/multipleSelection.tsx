import type { SpeedDialActionProps } from "@material-ui/lab";

import { SpeedDialAction } from "components";
import { config as featuresConfig } from "config/features";
import { renderActions, selectSelectMultiple } from "slices/renderSlice";
import { useAppDispatch, useAppSelector } from "app/store";

type Props = SpeedDialActionProps;

export function MultipleSelection(props: Props) {
    const { name, Icon } = featuresConfig["multipleSelection"];
    const active = useAppSelector(selectSelectMultiple);
    const dispatch = useAppDispatch();

    return (
        <SpeedDialAction
            {...props}
            data-test="multiple-selection"
            active={active}
            onClick={() => dispatch(renderActions.toggleSelectMultiple())}
            title={name}
            icon={<Icon />}
        />
    );
}
