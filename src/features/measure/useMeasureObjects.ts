import { useEffect, useState } from "react";
import { DuoMeasurementValues } from "@novorender/measure-api";

import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useAppDispatch, useAppSelector } from "app/store";
import { ExtendedMeasureEntity } from "types/misc";

import { measureActions, selectMeasureEntities } from "./measureSlice";

export function useMeasureObjects() {
    const {
        state: { measureScene },
    } = useExplorerGlobals();

    const selectedEntities = useAppSelector(selectMeasureEntities);
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
                selectedEntities.map(async (obj) => {
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
    }, [measureScene, setMeasureObjects, selectedEntities, dispatch]);

    return measureObjects;
}
