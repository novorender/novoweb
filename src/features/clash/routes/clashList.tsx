import { ArrowBack, FlightTakeoff, Search } from "@mui/icons-material";
import {
    Box,
    Button,
    FormControl,
    IconButton,
    InputAdornment,
    InputLabel,
    ListItemButton,
    OutlinedInput,
    Typography,
    useTheme,
} from "@mui/material";
import { BoundingSphere } from "@novorender/api";
import { CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useParams } from "react-router-dom";
import ReactVirtualizedAutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList } from "react-window";

import { useAppDispatch } from "app/redux-store-interactions";
import { Divider, LinearProgress } from "components";
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
import { compareStrings, getAssetUrl } from "utils/misc";
import { getObjectNameFromPath } from "utils/objectData";
import { batchedPropertySearch } from "utils/search";

import { useGetClashListQuery } from "../clashApi";
import { clashActions } from "../slice";
import { Clash } from "../types";

type ObjInfo = {
    name: string;
    sphere?: BoundingSphere;
};

type ClashExt = Clash & {
    index: number;
    obj1: ObjInfo | undefined;
    obj2: ObjInfo | undefined;
};

export default function ClashList() {
    const {
        state: { view, db },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();
    const theme = useTheme();
    const history = useHistory();
    const dispatchHighlightCollections = useDispatchHighlightCollections();
    const dispatch = useAppDispatch();
    const [currentIndex, setCurrentIndex] = useState<number | null>(null);
    const [filter, setFilter] = useState("");
    const [filterDraft, setFilterDraft] = useState("");

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
                        ]),
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
                clashes.map((c) => c.objIds[0]),
            ),
        );
        dispatchHighlightCollections(
            highlightCollectionsActions.setIds(
                HighlightCollection.ClashObjects2,
                clashes.map((c) => c.objIds[1]),
            ),
        );
    }, [dispatchHighlightCollections, profile]);

    const allClashes = useMemo(() => {
        if (!profile || objectMap.status !== AsyncStatus.Success) {
            return [];
        }

        return profile.clashes
            .map((clash, index) => {
                const [id1, id2] = clash.objIds;
                const obj1 = objectMap.data.get(id1);
                const obj2 = objectMap.data.get(id2);
                return { ...clash, index, obj1, obj2 } as ClashExt;
            })
            .sort((c1, c2) => {
                return (
                    compareStrings(c1.obj1?.name ?? "", c2.obj1?.name ?? "") ||
                    compareStrings(c1.obj2?.name ?? "", c2.obj2?.name ?? "")
                );
            });
    }, [profile, objectMap]);

    const clashes = useMemo(() => {
        if (!filter) {
            return allClashes;
        }
        const filterLc = filter.toLowerCase();
        return allClashes.filter((clash) => satisfiesFilter(clash, filterLc));
    }, [allClashes, filter]);

    const applyFilter = () => {
        setFilter(filterDraft);
        if (filterDraft && currentIndex !== null) {
            const currentItem = allClashes.find((c) => c.index === currentIndex)!;
            if (!satisfiesFilter(currentItem, filterDraft.toLowerCase())) {
                selectClash(null);
                setCurrentIndex(null);
            }
        }
    };

    useEffect(() => {
        dispatch(renderActions.setDefaultVisibility(ObjectVisibility.SemiTransparent));

        return () => {
            dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Neutral));
            dispatchHighlightCollections(highlightCollectionsActions.setIds(HighlightCollection.ClashObjects1, []));
            dispatchHighlightCollections(highlightCollectionsActions.setIds(HighlightCollection.ClashObjects2, []));
            dispatch(clashActions.setSelectedClash(null));
        };
    }, [dispatch, dispatchHighlightCollections]);

    const selectClash = useCallback(
        (clash: Clash | null, _id?: number) => {
            dispatch(clashActions.setSelectedClash(clash));

            dispatchHighlightCollections(
                highlightCollectionsActions.setIds(HighlightCollection.ClashObjects1, clash ? [clash.objIds[0]] : []),
            );
            dispatchHighlightCollections(
                highlightCollectionsActions.setIds(HighlightCollection.ClashObjects2, clash ? [clash.objIds[1]] : []),
            );
        },
        [dispatch, dispatchHighlightCollections],
    );

    const handleObjectClick = useCallback(
        (e: React.MouseEvent, clash: Clash, index: number, id: number, obj: ObjInfo | undefined) => {
            e.stopPropagation();
            selectClash(clash, id);
            setCurrentIndex(index);

            if (obj?.sphere) {
                flyTo({ sphere: obj.sphere });
            }
        },
        [flyTo, selectClash],
    );

    const handlePointClick = useCallback(
        (e: React.MouseEvent, clash: ClashExt, index: number) => {
            e.stopPropagation();
            setCurrentIndex(index);

            const sphere1 = clash.obj1?.sphere;
            const sphere2 = clash.obj2?.sphere;
            if (sphere1 && sphere2) {
                const radius = Math.max(1, Math.max(sphere1.radius, sphere2.radius) * 0.1);
                flyTo({ sphere: { center: clash.clashPoint, radius } });
            }

            selectClash(clash);
        },
        [flyTo, selectClash],
    );

    const Row = useMemo(() => {
        return ({ index, style }: { index: number; style: CSSProperties }) => {
            if (!profile || objectMap.status !== AsyncStatus.Success) {
                return null;
            }

            const clash = clashes[index];
            const [id1, id2] = clash.objIds;
            const { obj1, obj2 } = clash;

            return (
                <ListItemButton
                    style={style}
                    sx={{ display: "flex", alignItems: "center" }}
                    selected={currentIndex === index}
                    onClick={(e) => handlePointClick(e, clash, index)}
                >
                    <Box display="flex" flex="auto">
                        <Button
                            onClick={(e) => handleObjectClick(e, clash, index, id1, obj1)}
                            color="grey"
                            sx={{ flex: "0 0 50%" }}
                            title={obj1?.name}
                        >
                            <Typography whiteSpace="nowrap" textOverflow="ellipsis" overflow="auto" color="red">
                                {obj1?.name ?? "[not found]"}
                            </Typography>
                        </Button>
                        <Button
                            onClick={(e) => handleObjectClick(e, clash, index, id2, obj2)}
                            color="grey"
                            sx={{ flex: "0 0 50%" }}
                            title={obj2?.name}
                        >
                            <Typography whiteSpace="nowrap" textOverflow="ellipsis" overflow="auto" color="blue">
                                {obj2?.name ?? "[not found]"}
                            </Typography>
                        </Button>
                    </Box>
                    <IconButton size="small">
                        <FlightTakeoff />
                    </IconButton>
                </ListItemButton>
            );
        };
    }, [profile, objectMap, currentIndex, handleObjectClick, handlePointClick, clashes]);

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
                        {t("back")}
                    </Button>
                </Box>
            </Box>

            {isLoading || objectMap.status === AsyncStatus.Initial || objectMap.status === AsyncStatus.Loading ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : !profile ? (
                <Box color="grey" m={4} textAlign="center">
                    {t("profileNotFound")}
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
                    <Box mx={2} mt={2}>
                        <FormControl fullWidth variant="outlined">
                            <InputLabel htmlFor="clash-filter">{t("filter")}</InputLabel>
                            <OutlinedInput
                                id="clash-filter"
                                value={filterDraft}
                                fullWidth
                                onChange={(e) => setFilterDraft(e.target.value)}
                                onBlur={applyFilter}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        applyFilter();
                                    }
                                }}
                                endAdornment={
                                    <InputAdornment position="end">
                                        <IconButton onClick={applyFilter} edge="end">
                                            <Search />
                                        </IconButton>
                                    </InputAdornment>
                                }
                                label="Filter"
                            />
                        </FormControl>
                    </Box>
                    <Box flex="auto">
                        <ReactVirtualizedAutoSizer>
                            {({ height, width }) => (
                                <FixedSizeList height={height} width={width} itemCount={clashes.length} itemSize={52}>
                                    {Row}
                                </FixedSizeList>
                            )}
                        </ReactVirtualizedAutoSizer>
                    </Box>
                </>
            ) : null}
        </>
    );
}

function satisfiesFilter(clash: ClashExt, filterLc: string) {
    return clash.obj1?.name?.toLowerCase().includes(filterLc) || clash.obj2?.name?.toLowerCase().includes(filterLc);
}
