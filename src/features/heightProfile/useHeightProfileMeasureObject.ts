import { useEffect, useState } from "react";
import { MeasureEntity } from "@novorender/measure-api";
import { vec3 } from "gl-matrix";

import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useAppDispatch, useAppSelector } from "app/store";
import { AsyncStatus } from "types/misc";

import { heightProfileActions, selectSelectedPoint } from "./heightProfileSlice";

type ExtendedMeasureEntity = MeasureEntity & {
    pos: vec3;
};

export function useHeightProfileMeasureObject() {
    const {
        state: { measureScene },
    } = useExplorerGlobals();

    const point = useAppSelector(selectSelectedPoint);
    const dispatch = useAppDispatch();

    const [measureObjects, setMeasureObjects] = useState(undefined as undefined | ExtendedMeasureEntity);

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
                setMeasureObjects(undefined);
                return;
            }

            try {
                dispatch(heightProfileActions.setSelectedEntity({ status: AsyncStatus.Loading }));

                const mObject = await measureScene.pickMeasureEntity(point.id, point.pos).then((_mObj) => {
                    const mObj = _mObj as ExtendedMeasureEntity;
                    mObj.pos = point.pos;

                    return mObj;
                });

                dispatch(
                    heightProfileActions.setSelectedEntity({
                        status: AsyncStatus.Success,
                        data: mObject,
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
                setMeasureObjects(undefined);
            }
        }
    }, [measureScene, setMeasureObjects, point, dispatch]);

    return measureObjects;
}
