import { Box, CircularProgress, SpeedDialActionProps } from "@mui/material";
import { useState } from "react";

import { SpeedDialAction } from "components";
import IconButtonExt from "components/iconButtonExt";
import { featuresConfig } from "config/features";
import { useResetView } from "features/home/useResetView";
import { AsyncStatus } from "types/misc";

type Props = SpeedDialActionProps;

export function ClearView({ newDesign, ...props }: Props & { newDesign?: boolean }) {
    const { name, Icon } = featuresConfig["clearView"];
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
            <IconButtonExt onClick={handleClick} title={name} loading={isLoading} disabled={isLoading}>
                <Icon />
            </IconButtonExt>
        );
    } else {
        return (
            <SpeedDialAction
                {...props}
                data-test="clear-selection"
                onClick={handleClick}
                title={name}
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
}
