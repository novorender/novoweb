import { FollowParametricObject } from "@novorender/measure-api";
import { useEffect, useState } from "react";

import { useAppDispatch } from "app/store";
import { LinearProgress } from "components";
import { Picker, renderActions } from "slices/renderSlice";
import { AsyncStatus } from "types/misc";

import { Follow } from "../follow";
import { followPathActions } from "../followPathSlice";
import { usePathMeasureObjects } from "../usePathMeasureObjects";

export function FollowParametricFromPos() {
    const objects = usePathMeasureObjects();
    const [following, setFollowing] = useState(undefined as undefined | FollowParametricObject);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (following || objects.status !== AsyncStatus.Success || !objects.data.length) {
            return;
        }

        const fp = objects.data[0].fp;
        if (!fp) {
            return;
        }

        dispatch(renderActions.stopPicker(Picker.FollowPathObject));
        dispatch(followPathActions.toggleDrawSelectedPositions(false));
        setFollowing(fp);
    }, [objects, following, dispatch]);

    return following ? <Follow fpObj={following} /> : <LinearProgress />;
}
