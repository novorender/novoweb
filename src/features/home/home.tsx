import { Box, CircularProgress, SpeedDialActionProps, Tooltip } from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { SpeedDialAction } from "components";
import IconButtonExt from "components/iconButtonExt";
import { featuresConfig } from "config/features";

import { useResetView } from "./useResetView";

type Props = SpeedDialActionProps & {
    position?: { top?: number; right?: number; bottom?: number; left?: number };
    newDesign?: boolean;
};

enum Status {
    Initial,
    Loading,
}

const { nameKey, Icon } = featuresConfig["home"];

export function Home({ position, newDesign, ...speedDialProps }: Props) {
    const { t } = useTranslation();
    const [status, setStatus] = useState(Status.Initial);
    const disabled = status === Status.Loading;
    const resetView = useResetView();

    const handleClick = async () => {
        setStatus(Status.Loading);
        await resetView();
        setStatus(Status.Initial);
    };

    if (newDesign) {
        return (
            <Tooltip title={t(nameKey)} placement="top">
                <Box>
                    <IconButtonExt onClick={handleClick} loading={status === Status.Loading} disabled={disabled}>
                        <Icon />
                    </IconButtonExt>
                </Box>
            </Tooltip>
        );
    }

    return (
        <SpeedDialAction
            {...speedDialProps}
            data-test="home"
            FabProps={{
                disabled,
                ...speedDialProps.FabProps,
                style: { ...position, position: "absolute" },
            }}
            onClick={handleClick}
            title={t(nameKey)}
            icon={
                <Box
                    width={1}
                    height={1}
                    position="relative"
                    display="inline-flex"
                    justifyContent="center"
                    alignItems="center"
                >
                    {status === Status.Loading ? (
                        <CircularProgress thickness={2.5} sx={{ position: "absolute" }} />
                    ) : null}
                    <Icon />
                </Box>
            }
        />
    );
}
