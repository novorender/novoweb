import { CollisionValues } from "@novorender/measure-api";
import { vec3 } from "gl-matrix";
import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { manholeActions, selectManholeMeasureAgainst, selectManholeMeasureValues } from "./manholeSlice";

export function useHandleManholeCollision() {
    const {
        state: { measureScene },
    } = useExplorerGlobals();

    const measureAgainst = useAppSelector(selectManholeMeasureAgainst);
    const manhole = useAppSelector(selectManholeMeasureValues);
    const dispatch = useAppDispatch();

    useEffect(() => {
        getMeasureEntity();

        async function getMeasureEntity() {
            if (!measureScene || !measureAgainst?.entity) {
                dispatch(manholeActions.setCollisionValues(undefined));
                return;
            }

            const { selected, entity } = measureAgainst;

            if (entity.drawKind === "face" && manhole) {
                const res = (await measureScene
                    .collision(entity, manhole.outer.entity, selected.settings)
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
    }, [measureScene, dispatch, manhole?.bottom, measureAgainst, manhole]);

    return;
}
