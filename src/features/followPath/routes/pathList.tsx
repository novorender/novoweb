import { ArrowForward, LinearScale } from "@mui/icons-material";
import { Box, Button, FormControlLabel, List, ListItemButton, useTheme } from "@mui/material";
import { useEffect } from "react";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { Divider, IosSwitch, LinearProgress, ScrollBox } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { AsyncStatus, hasFinished } from "types/misc";
import { getObjectNameFromPath, getParentPath } from "utils/objectData";
import { searchByPatterns } from "utils/search";
import { Picker, renderActions, selectPicker } from "slices/renderSlice";

import { followPathActions, LandXmlPath, selectLandXmlPaths } from "../followPathSlice";
import { usePathMeasureObjects } from "../usePathMeasureObjects";

export function PathList() {
    const theme = useTheme();
    const history = useHistory<{ prevPath?: string }>();
    const {
        state: { scene },
    } = useExplorerGlobals(true);

    const landXmlPaths = useAppSelector(selectLandXmlPaths);
    const selecting = useAppSelector(selectPicker) === Picker.FollowPathObject;
    const [selected, isLoadingSelected] = usePathMeasureObjects();
    const dispatch = useAppDispatch();

    useEffect(() => {
        dispatch(followPathActions.toggleDrawSelected(true));

        return () => {
            dispatch(followPathActions.toggleDrawSelected(false));
            dispatch(renderActions.stopPicker(Picker.FollowPathObject));
        };
    }, [dispatch]);

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
                                    checked={selecting}
                                    onChange={() =>
                                        dispatch(
                                            renderActions.setPicker(selecting ? Picker.Object : Picker.FollowPathObject)
                                        )
                                    }
                                />
                            }
                            label={<Box fontSize={14}>Selecting</Box>}
                        />
                        <Button
                            disabled={!selected.length || selected.some((obj) => !obj.fp)}
                            onClick={() => {
                                dispatch(followPathActions.toggleResetPositionOnInit(true));
                                history.push("/parametric");
                            }}
                            color="grey"
                        >
                            Follow
                            <ArrowForward sx={{ ml: 1 }} />
                        </Button>
                    </Box>
                </>
            </Box>
            {!hasFinished(landXmlPaths) || isLoadingSelected ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : null}
            {hasFinished(landXmlPaths) ? (
                <ScrollBox p={1} pt={2} pb={2}>
                    {landXmlPaths.status === AsyncStatus.Error ? (
                        landXmlPaths.msg
                    ) : !landXmlPaths.data.length ? (
                        ""
                    ) : (
                        <List disablePadding>
                            {landXmlPaths.data.map((path) => (
                                <ListItemButton
                                    key={path.id}
                                    onClick={() => {
                                        dispatch(followPathActions.toggleResetPositionOnInit(true));
                                        history.push(`landXml/${path.id}`);
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
