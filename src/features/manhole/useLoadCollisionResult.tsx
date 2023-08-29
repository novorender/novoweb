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
        state: { measureView },
    } = useExplorerGlobals();

    const collisionTarget = useAppSelector(selectManholeCollisionTarget);
    const manhole = useAppSelector(selectManholeMeasureValues);
    const settings = useAppSelector(selectManholeCollisionSettings);
    const dispatch = useAppDispatch();

    useEffect(() => {
        getMeasureEntity();

        async function getMeasureEntity() {
            if (!measureView || !collisionTarget?.entity) {
                dispatch(manholeActions.setCollisionValues(undefined));
                return;
            }

            const { entity } = collisionTarget;

            if (entity.drawKind === "face" && manhole) {
                dispatch(manholeActions.setLoadingBrep(true));
                const [outerCollision, innerCollision] = await Promise.all([
                    measureView.collision.collision(entity, manhole.outer.entity, settings),
                    ...(manhole.inner ? [measureView.collision.collision(entity, manhole.inner.entity, settings)] : []),
                ]).catch((e) => {
                    console.warn(e);
                    return [];
                });

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
                                      outerCollision.point[1],
                                      manhole.bottomOuterElevation
                                  ),
                              ]
                            : undefined,
                        inner:
                            innerCollision && manhole.bottomInnerElevation
                                ? [
                                      innerCollision.point,
                                      vec3.fromValues(
                                          innerCollision.point[0],
                                          innerCollision.point[1],
                                          manhole.bottomInnerElevation
                                      ),
                                  ]
                                : undefined,
                        lid: innerCollision
                            ? [
                                  innerCollision.point,
                                  vec3.fromValues(
                                      innerCollision.point[0],
                                      innerCollision.point[1],
                                      manhole.topElevation
                                  ),
                              ]
                            : [
                                  outerCollision!.point,
                                  vec3.fromValues(
                                      outerCollision!.point[0],
                                      outerCollision!.point[1],
                                      manhole.topElevation
                                  ),
                              ],
                    })
                );
                dispatch(manholeActions.setLoadingBrep(false));
            }
        }
    }, [measureView, dispatch, collisionTarget, manhole, settings]);

    return;
}
