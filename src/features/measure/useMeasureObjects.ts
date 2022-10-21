import { useEffect, useState } from "react";
import { DuoMeasurementValues, MeasureSettings } from "@novorender/measure-api";

import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useAppDispatch, useAppSelector } from "app/store";

import { measureActions, selectMeasure } from "./measureSlice";
import { MeasureEntity } from "@novorender/measure-api";

export type ExtendedMeasureEntity = MeasureEntity & {
    settings?: MeasureSettings;
};

export function useMeasureObjects() {
    const {
        state: { measureScene },
    } = useExplorerGlobals();

    const measure = useAppSelector(selectMeasure);
    const dispatch = useAppDispatch();

    const [measureObjects, setMeasureObjects] = useState([] as ExtendedMeasureEntity[]);

    useEffect(() => {
        getMeasureObjects();

        async function getMeasureObjects() {
            if (!measureScene) {
                return;
            }

            dispatch(measureActions.setLoadingBrep(true));
            const mObjects = (await Promise.all(
                measure.selected.map((obj) =>
                    obj.id === -1
                        ? { ObjectId: -1, drawKind: "vertex", parameter: obj.pos }
                        : measureScene
                              .pickMeasureEntity(obj.id, obj.pos)
                              .then(async (_mObj) => {
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

                                  let mObj = _mObj as ExtendedMeasureEntity;
                                  mObj.settings = obj.settings;
                                  return mObj;
                              })
                              .catch(() => obj)
                )
            )) as ExtendedMeasureEntity[];

            if (mObjects.length !== 2) {
                dispatch(measureActions.setDuoMeasurementValues(undefined));
                setMeasureObjects(mObjects);
                dispatch(measureActions.setLoadingBrep(false));
                return;
            }

            const [obj1, obj2] = mObjects;

            let res: DuoMeasurementValues | undefined;

            res = (await measureScene
                .measure(obj1, obj2, obj1.settings, obj2.settings)
                .catch((e) => console.warn(e))) as DuoMeasurementValues | undefined;

            dispatch(measureActions.setDuoMeasurementValues(res));
            setMeasureObjects(mObjects);
            dispatch(measureActions.setLoadingBrep(false));
        }
    }, [measureScene, setMeasureObjects, measure.selected, dispatch]);

    return measureObjects;
}
