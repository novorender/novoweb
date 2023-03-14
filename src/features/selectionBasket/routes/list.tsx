import { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { HierarcicalObjectReference } from "@novorender/webgl-api";
import { ArrowBack, Flight } from "@mui/icons-material";
import {
    Box,
    Button,
    ListItemButton,
    useTheme,
    List as MuiList,
    Typography,
    FormControlLabel,
    Checkbox,
} from "@mui/material";

import { ScrollBox, Divider, LinearProgress } from "components";
import { useSelectionBasket } from "contexts/selectionBasket";
import { getObjectNameFromPath, getTotalBoundingSphere } from "utils/objectData";
import { AsyncState, AsyncStatus, hasFinished } from "types/misc";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useAbortController } from "hooks/useAbortController";
import { useAppDispatch, useAppSelector } from "app/store";
import { CameraType, renderActions, selectCameraType, selectMainObject } from "features/render/renderSlice";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";

import { selectFlyOnSelect, selectionBasketSliceActions } from "../selectionBasketSlice";

export function List() {
    const theme = useTheme();
    const history = useHistory();
    const {
        state: { scene, view },
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
                const iterator = scene.search(
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
    }, [basket, scene, abortController, objects]);

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
                                size="medium"
                                color="primary"
                                disabled={cameraType !== CameraType.Flight}
                                checked={cameraType === CameraType.Flight && flyOnSelect}
                                onChange={() => {
                                    if (cameraType !== CameraType.Flight) {
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
                            cameraType !== CameraType.Flight ||
                            !(objects.status === AsyncStatus.Success && objects.data.length)
                        }
                        onClick={() => {
                            if (
                                cameraType !== CameraType.Flight ||
                                !(objects.status === AsyncStatus.Success && objects.data.length)
                            ) {
                                return;
                            }

                            const sphere = getTotalBoundingSphere(objects.data);
                            if (sphere) {
                                view.camera.controller.zoomTo(sphere);
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
                                                view.camera.controller.zoomTo(obj.bounds.sphere);
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
