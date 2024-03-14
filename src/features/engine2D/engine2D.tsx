import { MutableRefObject, useEffect, useRef } from "react";

import { ArcgisCanvas } from "features/arcgis";
import { AreaCanvas } from "features/area";
import { FollowPathCanvas } from "features/followPath";
import { HeightProfileCanvas } from "features/heightProfile";
import { ManholeCanvas } from "features/manhole";
import { HoverCanvas, MeasureCanvas } from "features/measure";
import { CrossSectionCanvas } from "features/orthoCam";
import { OutlineLaserCanvas } from "features/outlineLaser/canvas";
import { PointLineCanvas } from "features/pointLine";

type RenderFn = (moved: boolean, idleFrame?: boolean) => void;

export function Engine2D({
    pointerPosRef,
    renderFnRef,
    svg,
}: {
    pointerPosRef: MutableRefObject<Vec2>;
    renderFnRef: MutableRefObject<RenderFn | undefined>;
    svg: SVGSVGElement | null;
}) {
    const measureRenderFn = useRef<RenderFn | undefined>();
    const outlineLaserRenderFn = useRef<RenderFn | undefined>();
    const hoverRenderFn = useRef<RenderFn | undefined>();
    const areaRenderFn = useRef<RenderFn | undefined>();
    const plRenderFn = useRef<RenderFn | undefined>();
    const followPathRenderFn = useRef<RenderFn | undefined>();
    const manholeRenderFn = useRef<RenderFn | undefined>();
    const crossSectionRenderFn = useRef<RenderFn | undefined>();
    const heightProfileRenferFn = useRef<RenderFn | undefined>();
    const arcgisRenderFn = useRef<RenderFn | undefined>();

    useEffect(() => {
        renderFnRef.current = render;
        return () => (renderFnRef.current = undefined);

        function render(moved: boolean, idleFrame?: boolean) {
            areaRenderFn?.current?.(moved);
            plRenderFn?.current?.(moved);
            followPathRenderFn?.current?.(moved, idleFrame);
            manholeRenderFn?.current?.(moved);
            crossSectionRenderFn?.current?.(moved);
            heightProfileRenferFn?.current?.(moved);
            outlineLaserRenderFn?.current?.(moved);
            measureRenderFn.current?.(moved);
            hoverRenderFn?.current?.(moved);
            arcgisRenderFn?.current?.(moved);
        }
    }, [renderFnRef]);

    return (
        <>
            <MeasureCanvas renderFnRef={measureRenderFn} svg={svg} />
            <OutlineLaserCanvas renderFnRef={outlineLaserRenderFn} svg={svg} />
            <AreaCanvas renderFnRef={areaRenderFn} svg={svg} />
            <PointLineCanvas renderFnRef={plRenderFn} svg={svg} />
            <FollowPathCanvas renderFnRef={followPathRenderFn} pointerPosRef={pointerPosRef} svg={svg} />
            <ManholeCanvas renderFnRef={manholeRenderFn} />
            <CrossSectionCanvas renderFnRef={crossSectionRenderFn} />
            <HeightProfileCanvas renderFnRef={heightProfileRenferFn} />
            <HoverCanvas renderFnRef={hoverRenderFn} />
            <ArcgisCanvas renderFnRef={arcgisRenderFn} svg={svg} />
        </>
    );
}
