import { LinearProgress } from "components";
import { AsyncStatus } from "types/misc";

import { Follow } from "../follow";
import { useFollowPathFromIds } from "../useFollowPathFromIds";

export function FollowParametricFromIds() {
    const following = useFollowPathFromIds();

    return following.status === AsyncStatus.Success ? <Follow fpObj={following.data} /> : <LinearProgress />;
}
