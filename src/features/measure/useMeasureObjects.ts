import { DuoMeasurementValues } from "@novorender/api";
import { useEffect, useRef, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { ExtendedMeasureEntity } from "types/misc";

import { measureActions, selectMeasureEntities } from "./measureSlice";

export function useMeasureObjects() {
    const {
        state: { view },
    } = useExplorerGlobals();

    const selectedEntities = useAppSelector(selectMeasureEntities);
    const dispatch = useAppDispatch();

    const [measureObjects, setMeasureObjects] = useState([] as ExtendedMeasureEntity[]);
    const duoId = useRef(0);

    useEffect(() => {
        getMeasureObjects();

        async function getMeasureObjects() {
            const measureView = await view?.measure;

            dispatch(measureActions.setLoadingBrep(true));
            const mObjects = await Promise.all(
                selectedEntities.map(async (obj) => {
                    const ent = obj as ExtendedMeasureEntity;
                    if (ent.settings?.cylinderMeasure === "top") {
                        const swappedEnt = await measureView?.core.swapCylinder(ent, "outer");
                        if (swappedEnt) {
                            return { ...swappedEnt, settings: ent.settings };
                        }
                    } else if (ent.settings?.cylinderMeasure === "bottom") {
                        const swappedEnt = await measureView?.core.swapCylinder(ent, "inner");
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

            let result: DuoMeasurementValues | undefined;

            result = (await measureView?.core
                .measure(obj1, obj2, obj1.settings, obj2.settings)
                .catch((e) => console.warn(e))) as DuoMeasurementValues | undefined;

            dispatch(measureActions.setDuoMeasurementValues(result ? { result, id: duoId.current } : undefined));
            duoId.current++;
            setMeasureObjects(mObjects);
            dispatch(measureActions.setLoadingBrep(false));
        }
    }, [view, setMeasureObjects, selectedEntities, dispatch]);

    return measureObjects;
}
