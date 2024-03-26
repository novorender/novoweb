import { Close } from "@mui/icons-material";
import { Box, IconButton, Typography } from "@mui/material";
import { Fragment } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider } from "components";
import { renderActions, selectStamp, StampKind } from "features/render";
import { capitalize } from "utils/misc";

export function DitioMachineStamp() {
    const dispatch = useAppDispatch();
    const stamp = useAppSelector(selectStamp);

    if (stamp?.kind !== StampKind.DitioMachine) {
        return null;
    }

    const machine = stamp.data.machine;

    return (
        <Box px={2} pb={1} sx={{ pointerEvents: "auto" }}>
            <Box display="flex" alignItems={"center"} justifyContent={"space-between"}>
                <Typography fontWeight={600}>
                    {machine.kind === "dumper" ? machine.dumperName : machine.loaderName}
                </Typography>
                <IconButton size="small" onClick={() => dispatch(renderActions.setStamp(null))}>
                    <Close />
                </IconButton>
            </Box>
            <Divider sx={{ mb: 0.5 }} />
            {[
                ["Driver", machine.kind === "dumper" ? machine.dumperDriverName : machine.loaderDriverName],
                ["Company", machine.companyName],
                ["Phone", machine.mobilePhoneNumber],
                ["Mass type", machine.massTypeName],
                ...(machine.kind === "dumper"
                    ? [
                          ["Speed", Math.round(machine.speed)],
                          ["Tonnes/m3", machine.quantity],
                          ["Has load", capitalize(String(machine.dumperHasLoad))],
                      ]
                    : []),
                ["Last seen", new Date(machine.lastSeen).toLocaleString()],
            ].map(([key, value]) => (
                <Fragment key={key}>
                    <Typography variant="body2">{key}</Typography>
                    <Typography mb={0.5}>{value}</Typography>
                </Fragment>
            ))}
        </Box>
    );
}
