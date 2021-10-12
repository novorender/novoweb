import type { SpeedDialActionProps } from "@mui/material";

import { SpeedDialAction } from "components";
import { config as featuresConfig } from "config/features";
import { selectViewOnlySelected, renderActions } from "slices/renderSlice";
import { useAppDispatch, useAppSelector } from "app/store";

type Props = SpeedDialActionProps;

export function ViewOnlySelected(props: Props) {
    const { name, Icon } = featuresConfig["viewOnlySelected"];
    const active = useAppSelector(selectViewOnlySelected);

    const dispatch = useAppDispatch();

    return (
        <SpeedDialAction
            {...props}
            data-test="view-only-selected"
            active={active}
            onClick={() => dispatch(renderActions.toggleViewOnlySelected())}
            title={name}
            icon={<Icon />}
        />
    );
}
