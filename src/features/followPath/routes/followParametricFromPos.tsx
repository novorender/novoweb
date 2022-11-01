import { FollowParametricObject } from "@novorender/measure-api";
import { useEffect, useState } from "react";

import { useAppDispatch } from "app/store";
import { LinearProgress } from "components";
import { Picker, renderActions } from "slices/renderSlice";
import { AsyncStatus } from "types/misc";

import { Follow } from "../follow";
import { followPathActions } from "../followPathSlice";
import { usePathMeasureObjects } from "../usePathMeasureObjects";
import { useHistory } from "react-router-dom";

export function FollowParametricFromPos() {
    const history = useHistory();
    const objects = usePathMeasureObjects();
    const [following, setFollowing] = useState(undefined as undefined | FollowParametricObject);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (following) {
            return;
        }

        if (
            objects.status === AsyncStatus.Error ||
            (objects.status === AsyncStatus.Success && (!objects.data.length || !objects.data[0].fp))
        ) {
            history.push("/");
            return;
        }

        if (objects.status !== AsyncStatus.Success) {
            return;
        }

        const fp = objects.data[0].fp;
        dispatch(renderActions.stopPicker(Picker.FollowPathObject));
        dispatch(followPathActions.toggleDrawSelectedPositions(false));
        setFollowing(fp);
    }, [objects, following, dispatch, history]);

    return following ? <Follow fpObj={following} /> : <LinearProgress />;
}
