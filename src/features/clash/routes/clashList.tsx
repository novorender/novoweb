import { ArrowBack, FlightTakeoff } from "@mui/icons-material";
import { Box, Button, IconButton, List, ListItemButton, Typography, useTheme } from "@mui/material";
import { BoundingSphere } from "@novorender/api";
import { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";

import { useAppDispatch } from "app/redux-store-interactions";
import { Divider, LinearProgress, ScrollBox } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import {
    HighlightCollection,
    highlightCollectionsActions,
    useDispatchHighlightCollections,
} from "contexts/highlightCollections";
import { ObjectVisibility, renderActions } from "features/render";
import { useAbortController } from "hooks/useAbortController";
import useFlyTo from "hooks/useFlyTo";
import { AsyncState, AsyncStatus } from "types/misc";
import { getAssetUrl } from "utils/misc";
import { getObjectNameFromPath } from "utils/objectData";
import { batchedPropertySearch } from "utils/search";

import { useGetClashListQuery } from "../clashApi";
import { clashActions } from "../slice";
import { Clash } from "../types";

type ObjInfo = {
    name: string;
    sphere?: BoundingSphere;
};

export default function ClashList() {
    const {
        state: { view, db },
    } = useExplorerGlobals(true);
    const theme = useTheme();
    const history = useHistory();
    const dispatchHighlightCollections = useDispatchHighlightCollections();
    const dispatch = useAppDispatch();
    const [currentIndex, setCurrentIndex] = useState<number | null>(null);

    const profileId = useParams<{ id: string }>().id;
    const { data: profile, isLoading } = useGetClashListQuery({
        assetUrl: getAssetUrl(view, `clash/${profileId}.json`).toString(),
    });
    const [objectMap, setObjectMap] = useState<AsyncState<Map<number, ObjInfo>>>({
        status: AsyncStatus.Initial,
    });
    const [abortController, abort] = useAbortController();
    const flyTo = useFlyTo();

    useEffect(() => {
        if (profile) {
            abort();
        }
    }, [profile, abort]);

    useEffect(() => {
        loadObjectIds();

        async function loadObjectIds() {
            if (!profile || !db) {
                return;
            }

            setObjectMap({ status: AsyncStatus.Loading });

            try {
                const uniqueObjectIds = new Set();
                for (const clash of profile.clashes) {
                    for (const objId of clash.objIds) {
                        uniqueObjectIds.add(objId);
                    }
                }

                const abortSignal = abortController.current.signal;
                const objects = await batchedPropertySearch({
                    db,
                    property: "id",
                    value: [...uniqueObjectIds].map((id) => String(id)),
                    abortSignal,
                });

                if (abortSignal.aborted) {
                    return;
                }

                setObjectMap({
                    status: AsyncStatus.Success,
                    data: new Map(
                        objects.map((obj) => [
                            obj.id,
                            {
                                name: getObjectNameFromPath(obj.path),
                                sphere: obj.bounds?.sphere,
                            },
                        ])
                    ),
                });
            } catch (ex) {
                console.warn(ex);
                setObjectMap({ status: AsyncStatus.Error, msg: "Error loading objects" });
            }
        }
    }, [db, profile, abortController]);

    useEffect(() => {
        const clashes = profile?.clashes ?? [];
        dispatchHighlightCollections(
            highlightCollectionsActions.setIds(
                HighlightCollection.ClashObjects1,
                clashes.map((c) => c.objIds[0])
            )
        );
        dispatchHighlightCollections(
            highlightCollectionsActions.setIds(
                HighlightCollection.ClashObjects2,
                clashes.map((c) => c.objIds[1])
            )
        );
    }, [dispatchHighlightCollections, profile]);

    useEffect(() => {
        dispatch(renderActions.setDefaultVisibility(ObjectVisibility.SemiTransparent));

        return () => {
            dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Neutral));
            dispatchHighlightCollections(highlightCollectionsActions.setIds(HighlightCollection.ClashObjects1, []));
            dispatchHighlightCollections(highlightCollectionsActions.setIds(HighlightCollection.ClashObjects2, []));
            dispatch(clashActions.setSelectedClash(null));
        };
    }, [dispatch, dispatchHighlightCollections]);

    const selectClash = (clash: Clash, _id?: number) => {
        dispatch(clashActions.setSelectedClash(clash));

        dispatchHighlightCollections(
            highlightCollectionsActions.setIds(HighlightCollection.ClashObjects1, [clash.objIds[0]])
        );
        dispatchHighlightCollections(
            highlightCollectionsActions.setIds(HighlightCollection.ClashObjects2, [clash.objIds[1]])
        );
    };

    const handleObjectClick = (e: React.MouseEvent, clash: Clash, index: number, id: number) => {
        e.stopPropagation();
        selectClash(clash, id);
        setCurrentIndex(index);

        if (objectMap.status === AsyncStatus.Success) {
            const obj = objectMap.data.get(id);
            if (obj?.sphere) {
                flyTo({ sphere: obj.sphere });
            }
        }
    };

    const handlePointClick = (e: React.MouseEvent, clash: Clash, index: number) => {
        e.stopPropagation();
        setCurrentIndex(index);

        if (objectMap.status !== AsyncStatus.Success) {
            return;
        }

        const [id1, id2] = clash.objIds;
        const obj1 = objectMap.data.get(id1);
        const obj2 = objectMap.data.get(id2);
        const sphere1 = obj1?.sphere;
        const sphere2 = obj2?.sphere;
        if (sphere1 && sphere2) {
            const radius = Math.max(1, Math.max(sphere1.radius, sphere2.radius) * 0.1);
            flyTo({ sphere: { center: clash.clashPoint, radius } });
        }

        selectClash(clash);
    };

    return (
        <>
            {/* Header */}
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex" justifyContent={"space-between"}>
                    <Button color="grey" onClick={() => history.push("/")}>
                        <ArrowBack sx={{ mr: 1 }} />
                        Back
                    </Button>
                </Box>
            </Box>

            {isLoading || objectMap.status === AsyncStatus.Initial || objectMap.status === AsyncStatus.Loading ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : !profile ? (
                <Box color="grey" m={4} textAlign="center">
                    Profile not found
                </Box>
            ) : objectMap.status === AsyncStatus.Error ? (
                <Box color="grey" m={4} textAlign="center">
                    {objectMap.msg}
                </Box>
            ) : objectMap.status === AsyncStatus.Success ? (
                <>
                    <Typography fontWeight={600} mx={2} mt={2}>
                        {profile.name}
                    </Typography>
                    <ScrollBox>
                        <List>
                            {profile.clashes.map((clash, i) => {
                                const [id1, id2] = clash.objIds;
                                const obj1 = objectMap.data.get(id1);
                                const obj2 = objectMap.data.get(id2);

                                return (
                                    <ListItemButton
                                        key={i}
                                        sx={{ display: "flex", alignItems: "center" }}
                                        selected={currentIndex === i}
                                        onClick={(e) => handlePointClick(e, clash, i)}
                                    >
                                        <Box display="flex" flex="auto">
                                            <Button
                                                onClick={(e) => handleObjectClick(e, clash, i, id1)}
                                                color="grey"
                                                sx={{ flex: "0 0 50%" }}
                                                title={obj1?.name}
                                            >
                                                <Typography
                                                    whiteSpace="nowrap"
                                                    textOverflow="ellipsis"
                                                    overflow="auto"
                                                    color="red"
                                                >
                                                    {obj1?.name ?? "[not found]"}
                                                </Typography>
                                            </Button>
                                            <Button
                                                onClick={(e) => handleObjectClick(e, clash, i, id2)}
                                                color="grey"
                                                sx={{ flex: "0 0 50%" }}
                                                title={obj2?.name}
                                            >
                                                <Typography
                                                    whiteSpace="nowrap"
                                                    textOverflow="ellipsis"
                                                    overflow="auto"
                                                    color="blue"
                                                >
                                                    {obj2?.name ?? "[not found]"}
                                                </Typography>
                                            </Button>
                                        </Box>
                                        <IconButton size="small">
                                            <FlightTakeoff />
                                        </IconButton>
                                    </ListItemButton>
                                );
                            })}
                        </List>
                    </ScrollBox>
                </>
            ) : null}
        </>
    );
}
