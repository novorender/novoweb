import type { SpeedDialActionProps } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { SpeedDialAction } from "components";
import { featuresConfig } from "config/features";
import { renderActions, selectSelectMultiple } from "features/render";

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
