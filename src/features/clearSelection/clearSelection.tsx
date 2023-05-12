import { useState } from "react";
import { Box, CircularProgress, SpeedDialActionProps } from "@mui/material";

import { SpeedDialAction } from "components";
import { featuresConfig } from "config/features";
import { selectMainObject } from "features/render/renderSlice";
import { useAppSelector } from "app/store";
import { useHighlighted } from "contexts/highlighted";
import { useResetView } from "features/home/useResetView";
import { AsyncStatus } from "types/misc";

type Props = SpeedDialActionProps;

export function ClearSelection(props: Props) {
    const { name, Icon } = featuresConfig["clearSelection"];
    const { idArr: highlighted } = useHighlighted();
    const mainObject = useAppSelector(selectMainObject);
    const resetView = useResetView();
    const [status, setStatus] = useState(AsyncStatus.Initial);

    const selectedIds = mainObject !== undefined ? highlighted.concat(mainObject) : highlighted;

    const handleClick = async () => {
        setStatus(AsyncStatus.Loading);
        await resetView({ resetCamera: false });
        setStatus(AsyncStatus.Initial);
    };

    const disabled = !selectedIds.length;
    return (
        <SpeedDialAction
            {...props}
            data-test="clear-selection"
            FabProps={{ disabled, ...props.FabProps }}
            onClick={handleClick}
            title={disabled ? undefined : name}
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
