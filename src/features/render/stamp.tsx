import { Menu, popoverClasses } from "@mui/material";

import { renderActions, selectStamp, StampKind } from "features/render";
import { useAppDispatch, useAppSelector } from "app/store";
import { LogPointStamp, MachineLocationStamp } from "features/xsiteManage";
import { DeviationStamp } from "features/deviations";

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
            anchorPosition={{ top: stamp.mouseY, left: stamp.mouseX }}
            transitionDuration={{ exit: 0, enter: 150 }}
        >
            {stamp.kind === StampKind.MachineLocation ? (
                <MachineLocationStamp />
            ) : stamp.kind === StampKind.LogPoint ? (
                <LogPointStamp />
            ) : stamp.kind === StampKind.Deviation ? (
                <DeviationStamp />
            ) : null}
        </Menu>
    );
}