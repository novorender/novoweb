import { useEffect, useState } from "react";

import { useAppSelector } from "app/store";

import { selectMeasure } from "./measureSlice";
import { SnapTolerance } from "@novorender/api/types/measure";

export function useMeasureHoverSettings(): SnapTolerance {
    const measure = useAppSelector(selectMeasure);
    const [settings, setSettings] = useState<SnapTolerance>({ edge: 0.06, segment: 0.25, face: 0.07, point: 0.06 });

    useEffect(() => {
        switch (measure.snapKind) {
            case "point":
                setSettings({ point: 0.4 });
                return;
            case "curve":
                setSettings({ edge: 0.35, segment: 0.25 });
                return;
            case "surface":
                setSettings({ face: 0.09 });
                return;
        }
        setSettings({ edge: 0.06, segment: 0.25, face: 0.07, point: 0.2 });
    }, [measure.snapKind]);

    return settings;
}
