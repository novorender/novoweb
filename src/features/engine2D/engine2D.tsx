import { vec2 } from "gl-matrix";
import { MutableRefObject, useEffect, useRef } from "react";

import { MeasureDraw } from "./measureDraw";
import { UtilDraw } from "./utilDraw";

export function Engine2D({
    pointerPos,
    renderFnRef,
    interactionPositions,
}: {
    pointerPos: MutableRefObject<Vec2>;
    renderFnRef: MutableRefObject<((moved: boolean, idleFrame: boolean) => void) | undefined>;
    interactionPositions: MutableRefObject<(vec2 | undefined)[]>;
}) {
    const measureRenderFn = useRef<((moved: boolean, idleFrame: boolean) => void) | undefined>();
    const utilRenderFn = useRef<((moved: boolean, idleFrame: boolean) => void) | undefined>();
    useEffect(() => {
        renderFnRef.current = render;
        return () => (renderFnRef.current = undefined);
        function render(moved: boolean, idleFrame: boolean) {
            measureRenderFn.current?.(moved, idleFrame);
            utilRenderFn.current?.(moved, idleFrame);
        }
    }, [renderFnRef]);

    return (
        <>
            <MeasureDraw
                pointerPos={pointerPos}
                renderFnRef={measureRenderFn}
                interactionPositions={interactionPositions}
            />
            <UtilDraw renderFnRef={utilRenderFn} />
        </>
    );
}
