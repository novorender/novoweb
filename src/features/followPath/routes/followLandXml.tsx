import { useLayoutEffect } from "react";
import { useParams } from "react-router-dom";
import { Box } from "@mui/material";
import { vec3 } from "gl-matrix";

import { useAppDispatch, useAppSelector } from "app/store";
import { renderActions } from "slices/renderSlice";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { AsyncStatus, hasFinished } from "types/misc";
import { LinearProgress } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { followPathActions, Nurbs, selectCurrentPath, selectResetPositionOnInit } from "../followPathSlice";
import { getNurbs } from "../utils";
import { Follow } from "../follow";

export function FollowLandXml() {
    const id = Number(useParams<{ id: string }>().id);
    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const currentPath = useAppSelector(selectCurrentPath);
    const resetPos = useAppSelector(selectResetPositionOnInit);

    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();

    useLayoutEffect(() => {
        init();

        async function init() {
            if (!id) {
                return;
            }

            if (currentPath.status === AsyncStatus.Success && currentPath.data.id !== id) {
                dispatch(followPathActions.setCurrentPath({ status: AsyncStatus.Initial }));
            }

            if (currentPath.status !== AsyncStatus.Initial) {
                return;
            }

            dispatch(renderActions.setMainObject(id));
            dispatchHighlighted(highlightActions.setIds([id]));

            dispatch(followPathActions.setCurrentPath({ status: AsyncStatus.Loading }));
            const nurbs = await getNurbs({ scene, objectId: id }).catch((e) => console.warn(e));

            if (!nurbs) {
                dispatch(
                    followPathActions.setCurrentPath({
                        status: AsyncStatus.Error,
                        msg: `Failed to load path data for object ${id}`,
                    })
                );
                return;
            }

            const start = nurbs.knots[0];

            dispatch(followPathActions.setProfile(start.toFixed(3)));
            dispatch(followPathActions.setProfileRange({ min: nurbs.knots[0], max: nurbs.knots.slice(-1)[0] }));

            dispatch(
                followPathActions.setCurrentPath({
                    status: AsyncStatus.Success,
                    data: {
                        id,
                        nurbs,
                    },
                })
            );
        }
    }, [currentPath, id, dispatch, dispatchHighlighted, scene, resetPos]);

    const getPos =
        (nurbs: Nurbs) =>
        async (p: number): Promise<{ pt: vec3; dir: vec3 } | undefined> => {
            if (p < nurbs.knots[0] || p > nurbs.knots.slice(-1)[0]) {
                return;
            }

            let knot2Idx = nurbs.knots.findIndex((knot) => knot >= p);

            if (knot2Idx === -1) {
                dispatch(followPathActions.setPtHeight(0));
                return;
            }

            knot2Idx = Math.max(1, knot2Idx);
            const knot1Idx = knot2Idx - 1;

            const knot1 = nurbs.knots[knot1Idx];
            const knot2 = nurbs.knots[knot2Idx];

            const cp1 = vec3.fromValues(...nurbs.controlPoints[knot1Idx]);
            const cp2 = vec3.fromValues(...nurbs.controlPoints[knot2Idx]);

            const dir = vec3.sub(vec3.create(), cp1, cp2);
            vec3.normalize(dir, dir);

            const l = knot2 - knot1;
            const t = (p - knot1) / l;

            const pt = vec3.lerp(vec3.create(), cp1, cp2, t);

            return {
                pt,
                dir,
            };
        };

    return !hasFinished(currentPath) || (currentPath.status === AsyncStatus.Success && currentPath.data.id !== id) ? (
        <LinearProgress />
    ) : currentPath.status === AsyncStatus.Error ? (
        <Box p={1} py={2}>
            {currentPath.msg}
        </Box>
    ) : (
        <Follow getPos={getPos(currentPath.data.nurbs)} />
    );
}
