import { type SpeedDialActionProps } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { SpeedDialAction } from "components";
import IconButtonExt from "components/iconButtonExt";
import { featuresConfig } from "config/features";
import { ObjectVisibility, renderActions, selectDefaultVisibility } from "features/render";

type Props = SpeedDialActionProps;

export function ViewOnlySelected({ newDesign, ...props }: Props & { newDesign?: boolean }) {
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

    if (newDesign) {
        return (
            <IconButtonExt
                onClick={handleClick}
                title={name}
                active={currentVisibility === ObjectVisibility.Transparent}
                color={currentVisibility === ObjectVisibility.SemiTransparent ? "primary" : "default"}
            >
                <Icon />
            </IconButtonExt>
        );
    } else {
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
}
