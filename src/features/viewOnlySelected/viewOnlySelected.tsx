import { Box, type SpeedDialActionProps, Tooltip } from "@mui/material";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { SpeedDialAction } from "components";
import IconButtonExt from "components/iconButtonExt";
import { featuresConfig } from "config/features";
import { ObjectVisibility, renderActions, selectDefaultVisibility } from "features/render";

type Props = SpeedDialActionProps;

export function ViewOnlySelected({ newDesign, ...props }: Props & { newDesign?: boolean }) {
    const { nameKey, Icon } = featuresConfig["viewOnlySelected"];
    const { t } = useTranslation();
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
            <Tooltip title={t(nameKey)} placement="top">
                <Box>
                    <IconButtonExt
                        onClick={handleClick}
                        active={currentVisibility === ObjectVisibility.Transparent}
                        color={currentVisibility === ObjectVisibility.SemiTransparent ? "primary" : "default"}
                    >
                        <Icon />
                    </IconButtonExt>
                </Box>
            </Tooltip>
        );
    }

    return (
        <SpeedDialAction
            {...props}
            data-test="view-only-selected"
            active={currentVisibility !== ObjectVisibility.Neutral}
            onClick={handleClick}
            title={t(nameKey)}
            icon={<Icon />}
        />
    );
}
