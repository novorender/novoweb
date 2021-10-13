import type { SpeedDialActionProps } from "@mui/material";

import { SpeedDialAction } from "components";
import { config as featuresConfig } from "config/features";
import { selectDefaultVisibility, renderActions, ObjectVisibility } from "slices/renderSlice";
import { useAppDispatch, useAppSelector } from "app/store";

type Props = SpeedDialActionProps;

export function ViewOnlySelected(props: Props) {
    const { name, Icon } = featuresConfig["viewOnlySelected"];
    const active = useAppSelector(selectDefaultVisibility);

    const dispatch = useAppDispatch();

    return (
        <SpeedDialAction
            {...props}
            data-test="view-only-selected"
            active={active !== ObjectVisibility.Neutral}
            onClick={() => dispatch(renderActions.toggleDefaultVisibility())}
            title={name}
            icon={<Icon />}
        />
    );
}
