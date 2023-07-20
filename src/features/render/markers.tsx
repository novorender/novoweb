import { DitioMarkers } from "features/ditio";
import { ImageMarkers } from "features/images";
import { MyLocationMarker } from "features/myLocation/myLocationMarker";
import { LogPointMarkers, MachineLocationMarkers } from "features/xsiteManage";

export function Markers() {
    return (
        <>
            <MyLocationMarker />
            <DitioMarkers />
            <ImageMarkers />
            <MachineLocationMarkers />
            <LogPointMarkers />
        </>
    );
}
