import type { SpeedDialActionProps } from "@mui/material";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { SpeedDialAction } from "components";
import { featuresConfig } from "config/features";
import { renderActions, selectSelectMultiple } from "features/render";

type Props = SpeedDialActionProps;

export function MultipleSelection(props: Props) {
    const { t } = useTranslation();
    const { nameKey, Icon } = featuresConfig["multipleSelection"];
    const active = useAppSelector(selectSelectMultiple);
    const dispatch = useAppDispatch();

    return (
        <SpeedDialAction
            {...props}
            data-test="multiple-selection"
            active={active}
            onClick={() => dispatch(renderActions.toggleSelectMultiple())}
            title={t(nameKey)}
            icon={<Icon />}
        />
    );
}
