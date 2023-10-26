import { Box } from "@mui/material";
import { Redirect } from "react-router-dom";

import { LinearProgress } from "components";
import { AsyncStatus } from "types/misc";

import { Follow } from "../follow";
import { useFollowPathFromIds } from "../useFollowPathFromIds";

export function FollowParametricFromIds() {
    const following = useFollowPathFromIds();

    if (following.status === AsyncStatus.Error) {
        return <Redirect to="/" />;
    }

    return following.status === AsyncStatus.Success ? (
        <Follow fpObj={following.data} />
    ) : (
        <Box position="relative">
            <LinearProgress />
        </Box>
    );
}
