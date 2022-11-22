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
                dispatch(manholeActions.setLoadingBrep(true));
                const [outerCollision, innerCollision] = await Promise.all([
                    measureScene.collision(entity, manhole.outer.entity, settings),
                    ...(manhole.inner ? [measureScene.collision(entity, manhole.inner.entity, settings)] : []),
                ]);

                if (!outerCollision && !innerCollision) {
                    dispatch(manholeActions.setCollisionValues(undefined));
                    dispatch(manholeActions.setLoadingBrep(false));
                    return;
                }

                dispatch(
                    manholeActions.setCollisionValues({
                        outer: outerCollision
                            ? [
                                  outerCollision.point,
                                  vec3.fromValues(
                                      outerCollision.point[0],
                                      manhole.bottomOuterElevation,
                                      outerCollision.point[2]
                                  ),
                              ]
                            : undefined,
                        inner:
                            innerCollision && manhole.bottomInnerElevation
                                ? [
                                      innerCollision.point,
                                      vec3.fromValues(
                                          innerCollision.point[0],
                                          manhole.bottomInnerElevation,
                                          innerCollision.point[2]
                                      ),
                                  ]
                                : undefined,
                    })
                );
                dispatch(manholeActions.setLoadingBrep(false));
            }
        }
    }, [measureScene, dispatch, collisionTarget, manhole, settings]);

    return;
}
