import { Menu, popoverClasses } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { DeviationStamp } from "features/deviations";
import { DitioMachineStamp } from "features/ditio";
import { PropertiesStamp } from "features/properties";
import { LogPointStamp, MachineLocationStamp as XsiteMachineLocationStamp } from "features/xsiteManage";

import { CanvasContextMenuStamp } from "./canvasContextMenuStamp";
import { renderActions, selectStamp } from "./renderSlice";
import { StampKind } from "./types";

export function Stamp() {
    const dispatch = useAppDispatch();
    const stamp = useAppSelector(selectStamp);

    if (!stamp) {
        return null;
    }

    return (
        <Menu
            open={true}
            onClose={() => dispatch(renderActions.setStamp(null))}
            sx={{
                [`&.${popoverClasses.root}`]: {
                    pointerEvents: "none",
                },
            }}
            anchorReference="anchorPosition"
            anchorPosition={{ top: stamp.mouseY + 8, left: stamp.mouseX + 24 }}
            transitionDuration={{ exit: 0, enter: 150 }}
        >
            {stamp.kind === StampKind.XsiteManageMachineLocation ? (
                <XsiteMachineLocationStamp />
            ) : stamp.kind === StampKind.LogPoint ? (
                <LogPointStamp />
            ) : stamp.kind === StampKind.Deviation ? (
                <DeviationStamp />
            ) : stamp.kind === StampKind.CanvasContextMenu ? (
                <CanvasContextMenuStamp />
            ) : stamp.kind === StampKind.Properties ? (
                <PropertiesStamp />
            ) : stamp.kind === StampKind.DitioMachine ? (
                <DitioMachineStamp />
            ) : null}
        </Menu>
    );
}
