import { useEffect, useState } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { selectLoadingHandles, selectPicker } from "../renderSlice";
import { Picker } from "../types";

export function useHandleCanvasCursor() {
    const {
        state: { canvas },
    } = useExplorerGlobals();
    const picker = useAppSelector(selectPicker);
    const loadingHandles = useAppSelector(selectLoadingHandles);
    const [usingSvgCursor, setUsingSvgCursor] = useState<"measure" | "cross" | "gizmo" | "standard">("standard");
    const loading = loadingHandles.length !== 0;

    useEffect(() => {
        if (!canvas) {
            return;
        }

        const measureCursor = [
            Picker.CrossSection,
            Picker.Measurement,
            Picker.OrthoPlane,
            Picker.FollowPathObject,
            Picker.ClippingPlane,
            Picker.Area,
            Picker.PointLine,
            Picker.Manhole,
            Picker.HeightProfileEntity,
        ].includes(picker);

        setUsingSvgCursor(measureCursor ? "measure" : picker === Picker.OutlineLaser ? "gizmo" : "standard");
    }, [picker, canvas]);

    useEffect(() => {
        if (!canvas) {
            return;
        }

        if (usingSvgCursor !== "standard") {
            canvas.style.cursor = "none";
        } else if (loading) {
            canvas.style.cursor = "wait";
        } else {
            canvas.style.cursor = "default";
        }
    }, [canvas, usingSvgCursor, loading]);

    return usingSvgCursor;
}
