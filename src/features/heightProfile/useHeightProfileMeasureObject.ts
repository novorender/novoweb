import { useEffect, useState } from "react";
import { MeasureEntity, MeasureObject } from "@novorender/measure-api";
import { vec3 } from "gl-matrix";

import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useAppDispatch, useAppSelector } from "app/store";
import { heightProfileActions, selectSelectedPoint } from "./heightProfileSlice";
import { AsyncStatus } from "types/misc";

type ExtendedMeasureObject = MeasureObject & {
    pos: vec3;
};

type MeasurePoint = {
    pos: vec3;
    id: number;
    selectedEntity?: MeasureEntity;
};

export function useHeightProfileMeasureObject() {
    const {
        state: { measureScene },
    } = useExplorerGlobals();

    const point = useAppSelector(selectSelectedPoint);
    const dispatch = useAppDispatch();

    const [measureObjects, setMeasureObjects] = useState(undefined as undefined | ExtendedMeasureObject | MeasurePoint);

    useEffect(() => {
        getMeasureObjects();

        async function getMeasureObjects() {
            if (!measureScene) {
                return;
            }

            if (!point) {
                dispatch(
                    heightProfileActions.setSelectedEntity({
                        status: AsyncStatus.Initial,
                    })
                );
                setMeasureObjects(undefined);
                return;
            }

            if (point.id === -1) {
                dispatch(
                    heightProfileActions.setSelectedEntity({
                        status: AsyncStatus.Success,
                        data: undefined,
                    })
                );
                setMeasureObjects(point);
                return;
            }

            try {
                dispatch(heightProfileActions.setSelectedEntity({ status: AsyncStatus.Loading }));

                const mObject = await measureScene.downloadMeasureObject(point.id, point.pos).then((_mObj) => {
                    const mObj = _mObj as ExtendedMeasureObject;

                    if (mObj.selectedEntity) {
                        if (mObj.selectedEntity.kind === "vertex") {
                            return { ...point, pos: mObj.selectedEntity.parameter as vec3 };
                        }

                        mObj.pos = point.pos;
                    }

                    return mObj.selectedEntity ? mObj : (point as MeasurePoint);
                });

                dispatch(
                    heightProfileActions.setSelectedEntity({
                        status: AsyncStatus.Success,
                        data: mObject.selectedEntity,
                    })
                );
                setMeasureObjects(mObject);
            } catch (e) {
                dispatch(
                    heightProfileActions.setSelectedEntity({
                        status: AsyncStatus.Error,
                        msg: "Failed to load the selected entity.",
                    })
                );
                setMeasureObjects(point);
            }
        }
    }, [measureScene, setMeasureObjects, point, dispatch]);

    return measureObjects;
}
