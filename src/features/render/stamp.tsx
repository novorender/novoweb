import { Menu, popoverClasses } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/store";
import { DeviationStamp } from "features/deviations";
import { DitioMachineStamp } from "features/ditio";
import { DitioChecklistStamp } from "features/ditio/stamps/checklist";
import { PropertiesStamp } from "features/properties";
import { renderActions, selectStamp, StampKind } from "features/render";
import { LogPointStamp, MachineLocationStamp as XsiteMachineLocationStamp } from "features/xsiteManage";

import { CanvasContextMenuStamp } from "./canvasContextMenuStamp";

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
            ) : stamp.kind === StampKind.DitioChecklist ? (
                <DitioChecklistStamp />
            ) : null}
        </Menu>
    );
}
