import { MutableRefObject, useEffect, useRef } from "react";

import { MeasureDraw } from "./measureDraw";
import { UtilDraw } from "./utilDraw";

export function Engine2D({
    pointerPos,
    renderFnRef,
    svg,
}: {
    pointerPos: MutableRefObject<Vec2>;
    renderFnRef: MutableRefObject<((moved: boolean, idleFrame: boolean) => void) | undefined>;
    svg: SVGSVGElement | null;
}) {
    const measureRenderFn = useRef<((moved: boolean, idleFrame: boolean) => void) | undefined>();
    const utilRenderFn = useRef<((moved: boolean, idleFrame: boolean) => void) | undefined>();
    useEffect(() => {
        renderFnRef.current = render;
        return () => (renderFnRef.current = undefined);
        async function render(moved: boolean, idleFrame: boolean) {
            utilRenderFn.current?.(moved, idleFrame);
            measureRenderFn.current?.(moved, idleFrame);
        }
    }, [renderFnRef]);

    return (
        <>
            <MeasureDraw pointerPos={pointerPos} renderFnRef={measureRenderFn} svg={svg} />
            <UtilDraw renderFnRef={utilRenderFn} />
        </>
    );
}
