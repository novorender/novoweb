import { DuoMeasurementValues, MeasureSettings } from "@novorender/api";
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

    const [measureObjects, setMeasureObjects] = useState([] as ExtendedMeasureEntity[][]);
    const duoId = useRef(0);

    useEffect(() => {
        getMeasureObjects();

        async function getMeasureObjects() {
            const measureView = await view?.measure;

            dispatch(measureActions.setLoadingBrep(true));
            const mObjects: ExtendedMeasureEntity[][] = [];
            const results: (undefined | { result: DuoMeasurementValues; id: number; settings?: MeasureSettings })[] =
                [];
            for (const measure of selectedEntities) {
                mObjects.push(
                    await Promise.all(
                        measure.map(async (obj) => {
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
                    )
                );
            }

            for (const objs of mObjects) {
                if (objs.length !== 2) {
                    results.push(undefined);
                    continue;
                }

                const [obj1, obj2] = objs;
                let result: DuoMeasurementValues | undefined;
                result = (await measureView?.core
                    .measure(obj1, obj2, obj1.settings, obj2.settings)
                    .catch((e) => console.warn(e))) as DuoMeasurementValues | undefined;

                results.push(
                    result ? { result, id: duoId.current, settings: obj1.settings ?? obj2.settings } : undefined
                );
                duoId.current++;
            }
            dispatch(measureActions.setLoadingBrep(false));
            dispatch(measureActions.setDuoMeasurementValues(results));
            setMeasureObjects(mObjects);
        }
    }, [view, setMeasureObjects, selectedEntities, dispatch]);

    return measureObjects;
}
