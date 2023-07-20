import { ArrowBack, Flight } from "@mui/icons-material";
import {
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    ListItemButton,
    List as MuiList,
    Typography,
    useTheme,
} from "@mui/material";
import { HierarcicalObjectReference } from "@novorender/webgl-api";
import { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { Divider, LinearProgress, ScrollBox } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { useSelectionBasket } from "contexts/selectionBasket";
import { CameraType, renderActions, selectCameraType, selectMainObject } from "features/render/renderSlice";
import { useAbortController } from "hooks/useAbortController";
import { AsyncState, AsyncStatus, hasFinished } from "types/misc";
import { getObjectNameFromPath, getTotalBoundingSphere } from "utils/objectData";

import { selectFlyOnSelect, selectionBasketSliceActions } from "../selectionBasketSlice";

export function List() {
    const theme = useTheme();
    const history = useHistory();
    const {
        state: { db },
    } = useExplorerGlobals(true);

    const [abortController, abort] = useAbortController();
    const basket = useSelectionBasket().idArr;
    const [objects, setObjects] = useState<AsyncState<HierarcicalObjectReference[]>>({ status: AsyncStatus.Initial });

    const mainObject = useAppSelector(selectMainObject);
    const flyOnSelect = useAppSelector(selectFlyOnSelect);
    const cameraType = useAppSelector(selectCameraType);

    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();

    useEffect(() => {
        abort();
        setObjects({ status: AsyncStatus.Initial });
    }, [basket, abort]);

    useEffect(() => {
        loadObjectData();

        async function loadObjectData() {
            if (objects.status !== AsyncStatus.Initial) {
                return;
            }

            if (!basket.length) {
                setObjects({ status: AsyncStatus.Success, data: [] });
                return;
            }

            const abortSignal = abortController.current.signal;
            setObjects({ status: AsyncStatus.Loading });
            try {
                const iterator = db.search(
                    {
                        searchPattern: [{ property: "id", value: basket.slice(0, 100).map(String) }],
                    },
                    abortSignal
                );

                const data: HierarcicalObjectReference[] = [];
                for await (const ref of iterator) {
                    data.push(ref);
                }

                setObjects({
                    data,
                    status: AsyncStatus.Success,
                });
            } catch (e) {
                if (abortSignal.aborted) {
                    return;
                }

                console.warn(e);
                setObjects({ status: AsyncStatus.Error, msg: "An error occurred while loading object data." });
            }
        }
    }, [basket, db, abortController, objects]);

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex" justifyContent={"space-between"}>
                    <Button onClick={() => history.push("/")} color="grey" sx={{ mr: 3 }}>
                        <ArrowBack sx={{ mr: 1 }} />
                        Back
                    </Button>
                    <FormControlLabel
                        control={
                            <Checkbox
                                name="fly to object when selected"
                                size="medium"
                                color="primary"
                                disabled={cameraType !== CameraType.Pinhole}
                                checked={cameraType === CameraType.Pinhole && flyOnSelect}
                                onChange={() => {
                                    if (cameraType !== CameraType.Pinhole) {
                                        return;
                                    }

                                    dispatch(selectionBasketSliceActions.toggleFlyOnSelect());
                                }}
                            />
                        }
                        label={<Box fontSize={14}>Fly on select</Box>}
                    />
                    <Button
                        disabled={
                            cameraType !== CameraType.Pinhole ||
                            !(objects.status === AsyncStatus.Success && objects.data.length)
                        }
                        onClick={() => {
                            if (
                                cameraType !== CameraType.Pinhole ||
                                !(objects.status === AsyncStatus.Success && objects.data.length)
                            ) {
                                return;
                            }

                            const sphere = getTotalBoundingSphere(objects.data);
                            if (sphere) {
                                dispatch(renderActions.setCamera({ type: CameraType.Pinhole, zoomTo: sphere }));
                            }
                        }}
                        color="grey"
                    >
                        <Flight sx={{ mr: 1 }} />
                        Overview
                    </Button>
                </Box>
            </Box>
            {!hasFinished(objects) ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : objects.status === AsyncStatus.Error ? (
                objects.msg
            ) : (
                <ScrollBox pb={3}>
                    {!objects.data.length ? (
                        <Box p={1}>No objects in selection basket.</Box>
                    ) : (
                        <Box>
                            {objects.data.length !== basket.length && (
                                <Typography sx={{ px: 1, pt: 1, display: "block" }} variant="caption">
                                    Showing {objects.data.length} / {basket.length} objects in basket.
                                </Typography>
                            )}
                            <MuiList disablePadding>
                                {objects.data.map((obj) => (
                                    <ListItemButton
                                        disableGutters
                                        key={obj.id}
                                        selected={obj.id === mainObject}
                                        sx={{ px: 1 }}
                                        onClick={() => {
                                            dispatch(renderActions.setMainObject(obj.id));
                                            dispatchHighlighted(highlightActions.setIds([obj.id]));

                                            if (flyOnSelect && obj.bounds?.sphere) {
                                                dispatch(
                                                    renderActions.setCamera({
                                                        type: CameraType.Pinhole,
                                                        zoomTo: obj.bounds.sphere,
                                                    })
                                                );
                                            }
                                        }}
                                    >
                                        <Box display="flex" width={1} alignItems="center">
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    width: 0,
                                                    flex: "1 1 100%",

                                                    "& svg": {
                                                        minWidth: "auto",
                                                        margin: `0 ${theme.spacing(1)} 0 0`,
                                                        color: theme.palette.grey[700],
                                                    },
                                                }}
                                            >
                                                <Typography noWrap={true}>{getObjectNameFromPath(obj.path)}</Typography>
                                            </Box>
                                        </Box>
                                    </ListItemButton>
                                ))}
                            </MuiList>
                        </Box>
                    )}
                </ScrollBox>
            )}
        </>
    );
}
