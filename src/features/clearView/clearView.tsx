import { Box, CircularProgress, SpeedDialActionProps, Tooltip } from "@mui/material";
import { t } from "i18next";
import { useState } from "react";

import { SpeedDialAction } from "components";
import IconButtonExt from "components/iconButtonExt";
import { featuresConfig } from "config/features";
import { useResetView } from "features/home/useResetView";
import { AsyncStatus } from "types/misc";

type Props = SpeedDialActionProps;

export function ClearView({ newDesign, ...props }: Props & { newDesign?: boolean }) {
    const { nameKey, Icon } = featuresConfig["clearView"];
    const resetView = useResetView();
    const [status, setStatus] = useState(AsyncStatus.Initial);

    const handleClick = async () => {
        setStatus(AsyncStatus.Loading);
        await resetView({ resetCamera: false });
        setStatus(AsyncStatus.Initial);
    };

    const isLoading = status === AsyncStatus.Loading;

    if (newDesign) {
        return (
            <Tooltip title={t(nameKey)} placement="top">
                <Box>
                    <IconButtonExt onClick={handleClick} loading={isLoading} disabled={isLoading}>
                        <Icon />
                    </IconButtonExt>
                </Box>
            </Tooltip>
        );
    }

    return (
        <SpeedDialAction
            {...props}
            data-test="clear-selection"
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
                    {status === AsyncStatus.Loading ? (
                        <CircularProgress thickness={2.5} sx={{ position: "absolute" }} />
                    ) : null}
                    <Icon />
                </Box>
            }
        />
    );
}
