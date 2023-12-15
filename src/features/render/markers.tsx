import { DitioFeedMarkers, DitioMachineMarkers } from "features/ditio";
import { ImageMarkers } from "features/images";
import { JiraMarkers } from "features/jira";
import { MyLocationMarker } from "features/myLocation";
import { LogPointMarkers, MachineLocationMarkers } from "features/xsiteManage";

export function Markers() {
    return (
        <>
            <MyLocationMarker />
            <DitioFeedMarkers />
            <DitioMachineMarkers />
            <ImageMarkers />
            <MachineLocationMarkers />
            <LogPointMarkers />
            <JiraMarkers />
        </>
    );
}
