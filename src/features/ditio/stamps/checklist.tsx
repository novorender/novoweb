import { Close, Download, OpenInNew } from "@mui/icons-material";
import { Box, Button, IconButton, ImageList, ImageListItem, Typography } from "@mui/material";
import { Fragment, useMemo } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { Divider } from "components";
import { renderActions, selectStamp, StampKind } from "features/render";

import { ditioActions } from "../slice";

export function DitioChecklistStamp() {
    const dispatch = useAppDispatch();
    const stamp = useAppSelector(selectStamp);
    const images = useMemo(() => {
        const images: string[] = [];

        if (stamp?.kind == StampKind.DitioChecklist && stamp.data.checklist.hasImages) {
            stamp.data.checklist.sections?.forEach((section) => {
                section.images?.forEach((image) =>
                    images.push(image.url.replace("https://ditio-api-v3.azurewebsites.net/api/file/", "/ditio-file"))
                );
                section.questions?.forEach((question) =>
                    question.images?.forEach((image) =>
                        images.push(
                            image.url.replace("https://ditio-api-v3.azurewebsites.net/api/file/", "/ditio-file")
                        )
                    )
                );
            });
        }

        return images;
    }, [stamp]);

    if (stamp?.kind !== StampKind.DitioChecklist) {
        return null;
    }

    const checklist = stamp.data.checklist;

    return (
        <Box px={2} pb={1} sx={{ pointerEvents: "auto" }}>
            <Box display="flex" alignItems={"center"} justifyContent={"space-between"}>
                <Typography fontWeight={600}>{checklist.templateName}</Typography>
                <IconButton size="small" onClick={() => dispatch(renderActions.setStamp(null))}>
                    <Close />
                </IconButton>
            </Box>
            <Typography>{checklist.activityName}</Typography>
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
            {[
                checklist.modifiedByUserName
                    ? [
                          "Modified",
                          checklist.modifiedByUserName,
                          new Date(checklist.modifiedDateTime).toLocaleDateString(),
                      ]
                    : null,
                checklist.approvedByUserName ? ["Approved", checklist.approvedByUserName, ""] : null,
                checklist.submittedByUserName
                    ? [
                          "Submitted",
                          checklist.submittedByUserName,
                          new Date(checklist.submittedDateTime).toLocaleDateString(),
                      ]
                    : null,
                checklist.createdByUserName
                    ? ["Created", checklist.createdByUserName, new Date(checklist.createdDateTime).toLocaleDateString()]
                    : null,
            ]
                .filter((v): v is string[] => v !== null)
                .map(([action, actor, date]) => (
                    <Typography key={action + actor + date} variant="subtitle2" sx={{ mb: 0.5 }}>
                        {action} {date} by {actor}
                    </Typography>
                ))}
            <Divider sx={{ my: 1 }} />
            {images.length > 0 && (
                <ImageList cols={4} gap={12} sx={{ minHeight: 72 }}>
                    {images.map((image) => (
                        <ImageListItem
                            key={image}
                            sx={{
                                maxWidth: 72,
                                maxHeight: 72,
                                ["& img"]: { maxHeight: 72, maxWidth: 72 },
                                cursor: "pointer",
                            }}
                            onClick={() => {
                                dispatch(ditioActions.setActiveImg(image));
                            }}
                        >
                            <img src={image} loading="lazy" />
                        </ImageListItem>
                    ))}
                </ImageList>
            )}
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
