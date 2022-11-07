import { useEffect, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import {
    manholeActions,
    selectIsManholePinned,
    selectManholeId,
    selectManholeMeasureAgainst,
    selectManholeMeasureValues,
} from "./manholeSlice";
import { CollisionValues, MeasureEntity, MeasureSettings } from "@novorender/measure-api";
import { vec3 } from "gl-matrix";

export type ExtendedMeasureEntity = MeasureEntity & {
    settings?: MeasureSettings;
};

export function useHandleManholeUpdates() {
    const {
        state: { measureScene },
    } = useExplorerGlobals();

    const dispatch = useAppDispatch();
    const selectedObj = useAppSelector(selectManholeId);
    const selectManhole = !useAppSelector(selectIsManholePinned);

    useEffect(() => {
        loadManholeValues();

        async function loadManholeValues() {
            if (!measureScene) {
                return;
            }

            if (selectManhole) {
                if (!selectedObj) {
                    dispatch(manholeActions.setManholeValues(undefined));
                    return;
                }

                dispatch(manholeActions.setLoadingBrep(true));
                dispatch(manholeActions.setManholeValues(await measureScene.inspectObject(selectedObj, "manhole")));
                dispatch(manholeActions.setLoadingBrep(false));
            } else {
            }
        }
    }, [selectedObj, dispatch, measureScene, selectManhole]);
}

export function useManholeMeasure() {
    const {
        state: { measureScene },
    } = useExplorerGlobals();

    const obj = useAppSelector(selectManholeMeasureAgainst);
    const manhole = useAppSelector(selectManholeMeasureValues);
    const dispatch = useAppDispatch();

    const [measureEntity, setMeasureEntity] = useState(undefined as ExtendedMeasureEntity | undefined);

    useEffect(() => {
        if (!obj) {
            dispatch(manholeActions.setCollisionValues(undefined));
            setMeasureEntity(undefined);
            return;
        }
        getMeasureEntity();

        async function getMeasureEntity() {
            if (!measureScene || !obj) {
                return;
            }
            const entity = (await (obj.id === -1
                ? { ObjectId: -1, drawKind: "vertex", parameter: obj.pos }
                : measureScene.pickMeasureEntity(obj.id, obj.pos).then(async (_mObj) => {
                      if (obj.settings?.cylinderMeasure === "top") {
                          const swappedEnt = await measureScene.swapCylinder(_mObj, "outer");
                          if (swappedEnt) {
                              _mObj = swappedEnt;
                          }
                      } else if (obj.settings?.cylinderMeasure === "bottom") {
                          const swappedEnt = await measureScene.swapCylinder(_mObj, "inner");
                          if (swappedEnt) {
                              _mObj = swappedEnt;
                          }
                      }
                      return _mObj;
                  }))) as ExtendedMeasureEntity;

            if (entity.drawKind === "face" && manhole) {
                const res = (await measureScene
                    .collision(entity, manhole.outer.entity, obj.settings)
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

            setMeasureEntity(entity);
        }
    }, [measureScene, setMeasureEntity, dispatch, manhole?.bottom, obj, manhole]);

    return measureEntity;
}
