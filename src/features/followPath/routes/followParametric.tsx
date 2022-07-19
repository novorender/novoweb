import { FollowParametricObject } from "@novorender/measure-api";
import { useEffect, useState } from "react";

import { useAppDispatch } from "app/store";
import { LinearProgress } from "components";
import { Picker, renderActions } from "slices/renderSlice";

import { Follow } from "../follow";
import { followPathActions } from "../followPathSlice";
import { usePathMeasureObjects } from "../usePathMeasureObjects";

export function FollowParametric() {
    const [objects] = usePathMeasureObjects();
    const [following, setFollowing] = useState(undefined as undefined | FollowParametricObject);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (following || !objects.length) {
            return;
        }

        const fp = objects[0].fp;
        if (!fp) {
            return;
        }

        dispatch(renderActions.stopPicker(Picker.FollowPathObject));
        dispatch(followPathActions.toggleDrawSelected(false));
        dispatch(followPathActions.setProfile(fp.parameterBounds.start.toFixed(3)));
        dispatch(followPathActions.setProfileRange({ min: fp.parameterBounds.start, max: fp.parameterBounds.end }));
        setFollowing(fp);
    }, [objects, following, dispatch]);

    const getPos = async (p: number) => {
        const cam = await following?.getCameraValues(p);

        if (!cam) {
            return;
        }

        return { pt: cam.position, dir: cam.normal };
    };

    return following ? <Follow getPos={getPos} /> : <LinearProgress />;
}
