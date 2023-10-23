import type { SpeedDialActionProps } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/store";
import { SpeedDialAction } from "components";
import { featuresConfig } from "config/features";
import { ObjectVisibility, renderActions, selectDefaultVisibility } from "features/render/renderSlice";

type Props = SpeedDialActionProps;

export function ViewOnlySelected(props: Props) {
    const { name, Icon } = featuresConfig["viewOnlySelected"];
    const currentVisibility = useAppSelector(selectDefaultVisibility);

    const dispatch = useAppDispatch();

    const handleClick = () => {
        switch (currentVisibility) {
            case ObjectVisibility.Neutral:
                dispatch(renderActions.setDefaultVisibility(ObjectVisibility.SemiTransparent));
                return;
            case ObjectVisibility.SemiTransparent:
                dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Transparent));
                return;
            case ObjectVisibility.Transparent:
                dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Neutral));
        }
    };

    return (
        <SpeedDialAction
            {...props}
            data-test="view-only-selected"
            active={currentVisibility !== ObjectVisibility.Neutral}
            onClick={handleClick}
            title={name}
            icon={<Icon />}
        />
    );
}
