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
import { useEffect } from "react";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { Divider, IosSwitch, LinearProgress, ScrollBox } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { AsyncStatus, hasFinished } from "types/misc";
import { getObjectNameFromPath, getParentPath } from "utils/objectData";
import { searchByPatterns } from "utils/search";
import { Picker, renderActions, selectPicker } from "slices/renderSlice";
import { highlightActions, useDispatchHighlighted, useHighlighted } from "contexts/highlighted";
import { singleCylinderOptions } from "features/measure";

import { selectFollowCylindersFrom, followPathActions, LandXmlPath, selectLandXmlPaths } from "../followPathSlice";
import { usePathMeasureObjects } from "../usePathMeasureObjects";
import { useFollowPathFromIds } from "../useFollowPathFromIds";

export function PathList() {
    const theme = useTheme();
    const history = useHistory<{ prevPath?: string }>();
    const {
        state: { scene },
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
                let paths = [] as LandXmlPath[];

                await searchByPatterns({
                    scene,
                    searchPatterns: [{ property: "Novorender/Path", value: "true", exact: true }],
                    callback: (refs) =>
                        (paths = paths.concat(
                            refs.map(({ path, id }) => ({ id, name: getObjectNameFromPath(getParentPath(path)) }))
                        )),
                });

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
    }, [scene, landXmlPaths, dispatch]);

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
                                dispatch(followPathActions.toggleResetPositionOnInit(true));

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
                                    onClick={() => {
                                        dispatch(followPathActions.toggleResetPositionOnInit(true));
                                        dispatch(renderActions.setMainObject(path.id));
                                        dispatch(followPathActions.setSelectedIds([path.id]));
                                        dispatchHighlighted(highlightActions.setIds([path.id]));
                                        history.push(`/followIds`);
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
