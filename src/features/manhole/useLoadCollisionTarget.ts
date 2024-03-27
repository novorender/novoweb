import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { ExtendedMeasureEntity } from "types/misc";

import {
    manholeActions,
    selectManholeCollisionSettings,
    selectManholeCollisionTarget,
    selectManholeMeasureValues,
} from "./manholeSlice";

export function useLoadCollisionTarget() {
    const {
        state: { view },
    } = useExplorerGlobals();

    const obj = useAppSelector(selectManholeCollisionTarget)?.selected;
    const manhole = useAppSelector(selectManholeMeasureValues);
    const settings = useAppSelector(selectManholeCollisionSettings);
    const dispatch = useAppDispatch();

    useEffect(() => {
        getMeasureEntity();

        async function getMeasureEntity() {
            if (!view?.measure || !obj) {
                return;
            }

            dispatch(manholeActions.setLoadingBrep(true));
            const entity = (await (obj.id === -1
                ? { ObjectId: -1, drawKind: "vertex", parameter: obj.pos }
                : view.measure.core
                      .pickMeasureEntity(obj.id, obj.pos)
                      .then(async (_mObj) => {
                          if (settings?.cylinderMeasure === "top") {
                              const swappedEnt = await view?.measure?.core.swapCylinder(_mObj.entity, "outer");
                              if (swappedEnt) {
                                  _mObj.entity = swappedEnt;
                              }
                          } else if (settings?.cylinderMeasure === "bottom") {
                              const swappedEnt = await view?.measure?.core.swapCylinder(_mObj.entity, "inner");
                              if (swappedEnt) {
                                  _mObj.entity = swappedEnt;
                              }
                          }
                          return _mObj.entity;
                      })
                      .catch((e) => {
                          console.warn(e);
                          return { ObjectId: -1, drawKind: "vertex", parameter: obj.pos };
                      }))) as ExtendedMeasureEntity;

            dispatch(manholeActions.setCollisionEntity(entity));
            dispatch(manholeActions.setLoadingBrep(false));
        }
    }, [view, dispatch, obj, manhole, settings]);

    return;
}
