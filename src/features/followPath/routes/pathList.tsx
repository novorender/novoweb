import { ArrowForward, LinearScale } from "@mui/icons-material";
import {
    Box,
    Button,
    FormControlLabel,
    InputLabel,
    List,
    ListItemButton,
    MenuItem,
    OutlinedInput,
    Select,
    useTheme,
} from "@mui/material";
import { DuoMeasurementValues } from "@novorender/api";
import { useEffect } from "react";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { Divider, IosSwitch, LinearProgress, ScrollBox } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { highlightActions, useDispatchHighlighted, useHighlighted } from "contexts/highlighted";
import { measureActions, singleCylinderOptions } from "features/measure";
import { Picker, renderActions, selectPicker } from "features/render/renderSlice";
import { AsyncStatus, hasFinished } from "types/misc";
import { getObjectNameFromPath, getParentPath } from "utils/objectData";
import { searchByPatterns } from "utils/search";

import { followPathActions, selectFollowCylindersFrom, selectLandXmlPaths } from "../followPathSlice";
import { useFollowPathFromIds } from "../useFollowPathFromIds";
import { usePathMeasureObjects } from "../usePathMeasureObjects";

export function PathList() {
    const theme = useTheme();
    const history = useHistory<{ prevPath?: string }>();
    const {
        state: { db, view },
    } = useExplorerGlobals(true);
    const highlighted = useHighlighted().idArr;
    const dispatchHighlighted = useDispatchHighlighted();

    const landXmlPaths = useAppSelector(selectLandXmlPaths);
    const selectingPos = useAppSelector(selectPicker) === Picker.FollowPathObject;
    const dispatch = useAppDispatch();
    const selectedByPos = usePathMeasureObjects();
    const selectedById = useFollowPathFromIds();
    const followFrom = useAppSelector(selectFollowCylindersFrom);

    useEffect(() => {
        dispatch(followPathActions.toggleDrawSelectedPositions(true));

        return () => {
            dispatch(followPathActions.toggleDrawSelectedPositions(false));
            dispatch(renderActions.stopPicker(Picker.FollowPathObject));
        };
    }, [dispatch]);

    useEffect(() => {
        if (!highlighted.length || highlighted.length > 50 || selectingPos) {
            dispatch(followPathActions.setSelectedIds([]));
        } else {
            dispatch(followPathActions.setSelectedIds(highlighted));
        }
    }, [selectingPos, highlighted, dispatch]);

    useEffect(() => {
        if (landXmlPaths.status === AsyncStatus.Initial) {
            getLandXmlPaths();
        }

        async function getLandXmlPaths() {
            dispatch(followPathActions.setPaths({ status: AsyncStatus.Loading }));

            try {
                let paths = [] as {
                    id: number;
                    name: string;
                }[];

                await searchByPatterns({
                    db,
                    searchPatterns: [{ property: "Novorender/Path", value: "true", exact: true }],
                    callback: (refs) =>
                        (paths = paths.concat(
                            refs.map(({ path, id }) => ({ id, name: getObjectNameFromPath(getParentPath(path)) }))
                        )),
                });

                paths.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "accent" }));
                dispatch(followPathActions.setPaths({ status: AsyncStatus.Success, data: paths }));
            } catch (e) {
                console.warn(e);
                dispatch(
                    followPathActions.setPaths({
                        status: AsyncStatus.Error,
                        msg: "Failed to load list of paths to follow.",
                    })
                );
            }
        }
    }, [db, landXmlPaths, dispatch]);

    const isLoading =
        !hasFinished(landXmlPaths) ||
        (selectingPos && selectedByPos.status === AsyncStatus.Loading) ||
        (!selectingPos && selectedById.status === AsyncStatus.Loading);

    const canFollowSelected = selectingPos
        ? selectedByPos.status === AsyncStatus.Success &&
          selectedByPos.data.length &&
          !selectedByPos.data.some((obj) => !obj.fp)
        : selectedById.status === AsyncStatus.Success;

    const canUseCylinderOptions =
        (selectedById.status === AsyncStatus.Success &&
            (selectedById.data.type === "cylinders" || selectedById.data.type === "cylinder")) ||
        (selectedByPos.status === AsyncStatus.Success && selectedByPos.data.some((obj) => obj.drawKind === "face"));

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex" justifyContent="space-between" pl={1}>
                        <FormControlLabel
                            control={
                                <IosSwitch
                                    size="medium"
                                    color="primary"
                                    checked={selectingPos}
                                    onChange={() => {
                                        if (selectingPos) {
                                            dispatch(renderActions.setPicker(Picker.Object));
                                            dispatch(followPathActions.toggleDrawSelectedPositions(false));
                                        } else {
                                            dispatch(renderActions.setPicker(Picker.FollowPathObject));
                                            dispatch(followPathActions.toggleDrawSelectedPositions(true));
                                        }
                                    }}
                                />
                            }
                            label={<Box fontSize={14}>Entity</Box>}
                        />
                        <Button
                            disabled={!canFollowSelected}
                            onClick={() => {
                                dispatch(followPathActions.setReset("initPosition"));
                                dispatch(followPathActions.setRoadIds(undefined));
                                dispatch(followPathActions.setDrawRoadIds(undefined));

                                if (selectingPos) {
                                    history.push("/followPos");
                                } else {
                                    history.push("/followIds");
                                }
                            }}
                            color="grey"
                        >
                            Follow
                            <ArrowForward sx={{ ml: 1 }} />
                        </Button>
                    </Box>
                </>
            </Box>
            {isLoading ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : null}

            {canUseCylinderOptions ? (
                <ScrollBox p={1} pt={2} pb={2}>
                    <InputLabel sx={{ color: "text.primary" }}>Follow from: </InputLabel>
                    <Select
                        fullWidth
                        name="pivot"
                        size="small"
                        value={followFrom}
                        onChange={(e) => {
                            dispatch(followPathActions.setFollowFrom(e.target.value as "center" | "top" | "bottom"));
                        }}
                        input={<OutlinedInput fullWidth />}
                    >
                        {singleCylinderOptions.map((opt) => (
                            <MenuItem key={opt.val} value={opt.val}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </Select>
                </ScrollBox>
            ) : hasFinished(landXmlPaths) ? (
                <ScrollBox p={1} pt={2} pb={2}>
                    {landXmlPaths.status === AsyncStatus.Error ? (
                        landXmlPaths.msg
                    ) : !landXmlPaths.data.length ? (
                        ""
                    ) : (
                        <List disablePadding>
                            {landXmlPaths.data.map((path) => (
                                <ListItemButton
                                    disabled={selectingPos}
                                    key={path.id}
                                    onClick={async () => {
                                        dispatch(followPathActions.setSelectedPath(path.id));
                                        dispatch(followPathActions.setSelectedIds([path.id]));
                                        dispatch(followPathActions.setRoadIds(undefined));
                                        dispatch(followPathActions.setDrawRoadIds(undefined));
                                        dispatch(renderActions.setMainObject(path.id));
                                        dispatchHighlighted(highlightActions.setIds([path.id]));
                                        let initPos = true;
                                        history.push(`/followIds`);
                                        if (view.measure) {
                                            const segment = await view.measure.core.pickCurveSegment(path.id);
                                            if (segment) {
                                                const measure = await view.measure.core.measure(segment, {
                                                    drawKind: "vertex",
                                                    ObjectId: -1,
                                                    parameter: view.renderState.camera.position,
                                                });
                                                if (measure) {
                                                    const duoMeasure = measure as DuoMeasurementValues;
                                                    if (
                                                        duoMeasure.measureInfoB &&
                                                        typeof duoMeasure.measureInfoB.parameter === "number"
                                                    ) {
                                                        dispatch(
                                                            followPathActions.setProfile(
                                                                duoMeasure.measureInfoB.parameter.toFixed(3)
                                                            )
                                                        );
                                                        initPos = false;
                                                    }
                                                }
                                                dispatch(measureActions.setSelectedEntities([segment]));
                                                dispatch(measureActions.pin(0));
                                            }
                                        }
                                        dispatch(followPathActions.setReset(initPos ? "initPosition" : "default"));
                                    }}
                                    disableGutters
                                    color="primary"
                                    sx={{ px: 1, py: 0.5 }}
                                >
                                    <LinearScale sx={{ mr: 1 }} />
                                    {path.name}
                                </ListItemButton>
                            ))}
                        </List>
                    )}
                </ScrollBox>
            ) : null}
        </>
    );
}
