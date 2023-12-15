import { MeasureInteractions } from "features/measure/measureInteractions";
import { ClippingTracerInteractions } from "features/outlineLaser/laserInteractions";

export function Engine2DInteractions() {
    return (
        <>
            <ClippingTracerInteractions />
            <MeasureInteractions />
        </>
    );
}
