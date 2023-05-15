import { Box, Typography, IconButton, List } from "@mui/material";
import { Close } from "@mui/icons-material";
import { useEffect, useRef, useState } from "react";
import { useDrag } from "@use-gesture/react";

import { Divider, ScrollBox, Tooltip } from "components";
import { renderActions, selectStamp, StampKind } from "features/render";
import { useAppDispatch, useAppSelector } from "app/store";
import { getFileNameFromPath, getFilePathFromObjectPath, getPropertyDisplayName, isUrl } from "utils/objectData";

import { selectShowPropertiesStamp, selectStarredProperties } from "./slice";
import { ResizeHandle } from "./resizeHandle";

export function PropertiesStamp() {
    const dispatch = useAppDispatch();
    const stamp = useAppSelector(selectStamp);
    const starred = useAppSelector(selectStarredProperties);
    const enabled = useAppSelector(selectShowPropertiesStamp);
    const [properties, setProperties] = useState<[key: string, value: string][]>();
    const show = stamp?.kind === StampKind.Properties && enabled;

    const resizing = useRef(false);
    const lastMovementX = useRef(0);
    const [propertyNameWidth, setPropertyNameWidth] = useState(95);
    const bindResizeHandlers = useDrag(({ target, dragging, movement: [movementX] }) => {
        if (!(target instanceof HTMLDivElement) || !target.dataset.resizeHandle) {
            return;
        }

        resizing.current = true;

        const toMove = movementX - lastMovementX.current;
        lastMovementX.current = dragging ? movementX : 0;

        setPropertyNameWidth((state) => (state + toMove < 25 ? 25 : state + toMove > 300 ? 300 : state + toMove));
    });

    useEffect(() => {
        if (!show) {
            setProperties(undefined);
            return;
        }

        const filtered = stamp.properties
            .filter(([key]) => starred[key])
            .filter(([key, val]) => {
                if (!val) {
                    return false;
                }

                const isPath = key.toLowerCase() === "path";
                return !isPath || getFilePathFromObjectPath(val);
            });

        if (!filtered.length) {
            dispatch(renderActions.setStamp(null));
        } else {
            setProperties(filtered);
        }
    }, [show, stamp, starred, dispatch]);

    if (!show) {
        return null;
    }

    return (
        <Box
            sx={{ pointerEvents: "auto" }}
            display={"flex"}
            flexDirection={"column"}
            flexGrow={1}
            maxHeight={250}
            minWidth={"min(calc(100vw - 32px), 500px)"}
            height={1}
        >
            <Box px={1} display="flex" alignItems={"center"} justifyContent={"space-between"}>
                <Typography fontWeight={600}>{stamp.properties[0][1]}</Typography>
                <IconButton size="small" onClick={() => dispatch(renderActions.setStamp(null))}>
                    <Close />
                </IconButton>
            </Box>
            <Divider sx={{ mb: 0.5 }} />
            <ScrollBox pb={2}>
                <List
                    dense
                    disablePadding
                    sx={{ "& .propertyName": { width: propertyNameWidth } }}
                    {...bindResizeHandlers()}
                >
                    {properties?.map(([key, val]) => {
                        const isPath = key.toLowerCase() === "path";
                        return (
                            <Box key={key} px={1} width={1} display="flex">
                                <Box
                                    className="propertyName"
                                    flexShrink={0}
                                    display="flex"
                                    justifyContent="space-between"
                                >
                                    <Tooltip title={getPropertyDisplayName(key)}>
                                        <Typography noWrap={true}>{getPropertyDisplayName(key)}</Typography>
                                    </Tooltip>
                                    <ResizeHandle data-resize-handle>|</ResizeHandle>
                                </Box>
                                <Box flex="1 1 100%" width={0}>
                                    <Tooltip title={isPath ? getFilePathFromObjectPath(val) : val}>
                                        <Typography noWrap={true}>
                                            {isPath ? (
                                                getFileNameFromPath(val)
                                            ) : isUrl(val) ? (
                                                <a href={val} target="_blank" rel="noreferrer">
                                                    {val}
                                                </a>
                                            ) : (
                                                val
                                            )}
                                        </Typography>
                                    </Tooltip>
                                </Box>
                            </Box>
                        );
                    })}
                </List>
            </ScrollBox>
        </Box>
    );
}
