import { Close, Download, OpenInNew } from "@mui/icons-material";
import { Box, Button, IconButton, Typography } from "@mui/material";
import { Fragment } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { Divider } from "components";
import { renderActions, selectStamp, StampKind } from "features/render";

export function DitioChecklistStamp() {
    const dispatch = useAppDispatch();
    const stamp = useAppSelector(selectStamp);

    if (stamp?.kind !== StampKind.DitioChecklist) {
        return null;
    }

    const checklist = stamp.data.checklist;

    return (
        <Box px={2} pb={1} sx={{ pointerEvents: "auto" }}>
            <Box display="flex" alignItems={"center"} justifyContent={"space-between"}>
                <Typography fontWeight={600}>{checklist.activityName}</Typography>
                <IconButton size="small" onClick={() => dispatch(renderActions.setStamp(null))}>
                    <Close />
                </IconButton>
            </Box>
            <Divider sx={{ my: 1 }} />
            {checklist.dimensions
                .filter((dim) => dim.value)
                .map(({ id, name, value }) => (
                    <Fragment key={id}>
                        <Typography variant="body2">{name}</Typography>
                        <Typography mb={0.5}>{value}</Typography>
                    </Fragment>
                ))}
            <Divider sx={{ my: 1 }} />
            <Box display={"flex"} justifyContent={"space-between"}>
                <Button
                    variant="outlined"
                    sx={{ mr: 3 }}
                    component="a"
                    href={checklist.pdfUrl}
                    disabled={!checklist.pdfUrl}
                    target="_blank"
                >
                    <Download sx={{ mr: 1 }} /> Download PDF
                </Button>
                <Button variant={"contained"} component="a" href={checklist.selfUrl} target="_blank">
                    <OpenInNew sx={{ mr: 1 }} /> Open in Ditio
                </Button>
            </Box>
        </Box>
    );
}
