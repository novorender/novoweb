import { useEffect, useState } from "react";
import { DuoMeasurementValues, MeasureObject, MeasureSettings } from "@novorender/measure-api";
import { vec3 } from "gl-matrix";

import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useAppDispatch, useAppSelector } from "app/store";

import { measureActions, selectMeasure } from "./measureSlice";

export type ExtendedMeasureObject = MeasureObject & {
    pos: vec3;
    settings?: MeasureSettings;
};

type MeasurePoint = {
    pos: vec3;
    id: number;
    settings?: any;
    selectedEntity?: any;
};

export function useMeasureObjects() {
    const {
        state: { measureScene },
    } = useExplorerGlobals();

    const measure = useAppSelector(selectMeasure);
    const dispatch = useAppDispatch();

    const [measureObjects, setMeasureObjects] = useState([] as (ExtendedMeasureObject | MeasurePoint)[]);

    useEffect(() => {
        getMeasureObjects();

        async function getMeasureObjects() {
            if (!measureScene) {
                return;
            }

            const mObjects = (await Promise.all(
                measure.selected.map((obj) =>
                    obj.id === -1
                        ? obj
                        : measureScene
                              .downloadMeasureObject(obj.id, obj.pos)
                              .then(async (_mObj) => {
                                  const mObj = _mObj as ExtendedMeasureObject;
                                  if (obj.settings?.cylinderMeasure === "top") {
                                      await mObj.swapCylinder("outer");
                                  } else if (obj.settings?.cylinderMeasure === "bottom") {
                                      await mObj.swapCylinder("inner");
                                  }

                                  if (mObj.selectedEntity) {
                                      if (mObj.selectedEntity.kind === "vertex") {
                                          return { ...obj, pos: mObj.selectedEntity.parameter };
                                      }

                                      mObj.pos = obj.pos;
                                      mObj.settings = obj.settings;
                                  }

                                  return mObj.selectedEntity ? mObj : obj;
                              })
                              .catch(() => obj)
                )
            )) as (ExtendedMeasureObject | MeasurePoint)[];

            if (mObjects.length !== 2) {
                dispatch(measureActions.setDuoMeasurementValues(undefined));
                setMeasureObjects(mObjects);
                return;
            }

            const [obj1, obj2] = mObjects;

            let res: DuoMeasurementValues | undefined;

            if (obj1.selectedEntity && obj2.selectedEntity) {
                res = (await measureScene
                    .measure(obj1.selectedEntity!, obj2.selectedEntity, obj1.settings, obj2.settings)
                    .catch((e) => console.warn(e))) as DuoMeasurementValues | undefined;
            } else if (obj1.selectedEntity || obj2.selectedEntity) {
                const obj = obj1.selectedEntity ? obj1 : obj2;
                const pt = obj === obj1 ? obj2 : obj1;
                res = (await measureScene.measureToPoint(obj.selectedEntity, pt.pos, obj.settings)) as
                    | DuoMeasurementValues
                    | undefined;
            } else {
                res = measureScene.pointToPoint(obj1.pos, obj2.pos) as DuoMeasurementValues | undefined;
            }

            dispatch(measureActions.setDuoMeasurementValues(res));
            setMeasureObjects(mObjects);
        }
    }, [measureScene, setMeasureObjects, measure.selected, dispatch]);

    return measureObjects;
}
