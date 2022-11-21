import { CollisionValues } from "@novorender/measure-api";
import { vec3 } from "gl-matrix";
import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import {
    manholeActions,
    selectManholeCollisionSettings,
    selectManholeCollisionTarget,
    selectManholeMeasureValues,
} from "./manholeSlice";

export function useLoadCollisionResult() {
    const {
        state: { measureScene },
    } = useExplorerGlobals();

    const collisionTarget = useAppSelector(selectManholeCollisionTarget);
    const manhole = useAppSelector(selectManholeMeasureValues);
    const settings = useAppSelector(selectManholeCollisionSettings);
    const dispatch = useAppDispatch();

    useEffect(() => {
        getMeasureEntity();

        async function getMeasureEntity() {
            if (!measureScene || !collisionTarget?.entity) {
                dispatch(manholeActions.setCollisionValues(undefined));
                return;
            }

            const { entity } = collisionTarget;

            if (entity.drawKind === "face" && manhole) {
                const res = (await measureScene
                    .collision(entity, manhole.outer.entity, settings)
                    .catch((e) => console.warn(e))) as CollisionValues | undefined;
                if (res) {
                    dispatch(
                        manholeActions.setCollisionValues([
                            res.point,
                            vec3.fromValues(res.point[0], manhole.bottomElevation, res.point[2]),
                        ])
                    );
                } else {
                    dispatch(manholeActions.setCollisionValues(undefined));
                }
            }
        }
    }, [measureScene, dispatch, manhole?.bottom, collisionTarget, manhole, settings]);

    return;
}
