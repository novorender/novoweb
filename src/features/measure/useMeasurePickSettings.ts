import { useEffect, useState } from "react";
import { SnapTolerance } from "@novorender/measure-api";

import { useAppSelector } from "app/store";

import { selectMeasure } from "./measureSlice";

export function useMeasurePickSettings(): SnapTolerance {
    const measure = useAppSelector(selectMeasure);
    const [settings, setSettings] = useState<SnapTolerance>({ edge: 0.06, segment: 0.25, face: 0.07, point: 0.06 });

    useEffect(() => {
        switch (measure.snapKind) {
            case "point":
                setSettings({ point: 0.4 });
                return;
            case "curve":
                setSettings({ edge: 0.25, segment: 0.35 });
                return;
            case "surface":
                setSettings({ face: 0.09 });
                return;
        }
        setSettings({ edge: 0.032, segment: 0.25, face: 0.08, point: 0.06 });
    }, [measure.snapKind]);

    return settings;
}
