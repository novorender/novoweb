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
            const mObjects = await Promise.all(
                measure.selectedEntity.map(async (obj) => {
                    const ent = obj as ExtendedMeasureEntity;
                    if (ent.settings?.cylinderMeasure === "top") {
                        const swappedEnt = await measureScene.swapCylinder(ent, "outer");
                        if (swappedEnt) {
                            return { ...swappedEnt, settings: ent.settings };
                        }
                    } else if (ent.settings?.cylinderMeasure === "bottom") {
                        const swappedEnt = await measureScene.swapCylinder(ent, "inner");
                        if (swappedEnt) {
                            return { ...swappedEnt, settings: ent.settings };
                        }
                    }
                    return ent;
                })
            );

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
    }, [measureScene, setMeasureObjects, measure.selectedEntity, dispatch]);

    return measureObjects;
}
