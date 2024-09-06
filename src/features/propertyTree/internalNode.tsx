import {
    AddBoxOutlined,
    Folder,
    IndeterminateCheckBoxOutlined,
    MoreVert,
    Star,
    Visibility,
    VisibilityOff,
} from "@mui/icons-material";
import {
    Box,
    Checkbox,
    IconButton,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Typography,
} from "@mui/material";
import pMap from "p-map";
import { FocusEvent, MouseEvent, MutableRefObject, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useGetPropertyTreeFavoritesQuery, useSetPropertyTreeFavoritesMutation } from "apis/dataV2/dataV2Api";
import { Permission } from "apis/dataV2/permissions";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { LinearProgress } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { GroupStatus, ObjectGroup, objectGroupsActions, useDispatchObjectGroups } from "contexts/objectGroups";
import { useCheckProjectPermission } from "hooks/useCheckProjectPermissions";
import { useSceneId } from "hooks/useSceneId";
import { useToggle } from "hooks/useToggle";
import { selectHasAdminCapabilities, selectProjectIsV2 } from "slices/explorer";
import { AsyncStatus } from "types/misc";
import { hslToVec, VecRGBA } from "utils/color";
import { getAssetUrl } from "utils/misc";
import { searchDeepByPatterns } from "utils/search";
import { sleep } from "utils/time";

import { useGetPropertiesQuery } from "./api";
import { LeafNode } from "./leafNode";
import { propertyTreeActions, PropertyTreeGroup, selectGroupsAtProperty } from "./slice";

const colors = createColors(12);

export function InternalNode({
    path,
    propertyName,
    level,
    abortController,
}: {
    path: string;
    propertyName: string;
    level: number;
    abortController: MutableRefObject<AbortController>;
}) {
    const {
        state: { db, view },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();
    const sceneId = useSceneId();
    const dispatchGroups = useDispatchObjectGroups();

    const [expanded, toggleExpand] = useToggle(false);
    const groups = useAppSelector((state) => selectGroupsAtProperty(state, path));
    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    // TODO widget:propertyTree:manage?
    const checkPermission = useCheckProjectPermission();
    const canManage = checkPermission(Permission.SceneManage) ?? isAdmin;
    const searchStatus = useAppSelector((state) => state.propertyTree.searchStatus);
    const groupsCreationStatus = useAppSelector((state) => state.propertyTree.groupsCreationStatus);
    const isV2 = useAppSelector(selectProjectIsV2);
    const dispatch = useAppDispatch();

    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [leafColors, setLeafColors] = useState<VecRGBA[]>([]);

    const { data: favorites = [] } = useGetPropertyTreeFavoritesQuery({ projectId: sceneId }, { skip: !isV2 });
    const [setFavorites] = useSetPropertyTreeFavoritesMutation();
    const isFavorited = favorites.includes(path);

    const { data, isLoading: isLoadingNodeData } = useGetPropertiesQuery(
        { assetUrl: getAssetUrl(view, "").toString(), path },
        { skip: !expanded && !isFavorited },
    );

    const containsLeaves = data && "values" in data;

    useEffect(
        function generateLeafColors() {
            if (!data || !containsLeaves) {
                return;
            }

            setLeafColors(data.values.map((_val, i) => colors[i % colors.length]));
        },
        [data, containsLeaves],
    );

    const stopPropagation = (evt: MouseEvent | FocusEvent) => {
        evt.stopPropagation();
    };

    const openMenu = (evt: MouseEvent<HTMLButtonElement>) => {
        stopPropagation(evt);
        setMenuAnchor(evt.currentTarget.parentElement);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    const updateAllGroups = async (status: GroupStatus) => {
        if (!containsLeaves || searchStatus !== AsyncStatus.Initial) {
            return;
        }

        dispatch(propertyTreeActions.setSearchStatus(AsyncStatus.Loading));

        const abortSignal = abortController.current.signal;
        try {
            await pMap(
                data.values,
                async (val, idx) => {
                    const group = await search(val, abortSignal);

                    if (!group || abortSignal.aborted) {
                        return;
                    }

                    group.status = status;
                    group.color = leafColors[idx];
                    dispatch(
                        propertyTreeActions.upsertGroup({
                            group: group as PropertyTreeGroup,
                            property: path,
                            value: val,
                        }),
                    );
                    await sleep(20);
                },
                { concurrency: 1, signal: abortSignal },
            );
        } catch (e) {
            if (!abortSignal.aborted) {
                console.warn(e);
            }
        }

        dispatch(propertyTreeActions.setSearchStatus(AsyncStatus.Initial));
    };

    const search = async (
        value: string,
        abortSignal: AbortSignal,
    ): Promise<(Omit<PropertyTreeGroup, "color"> & { color?: VecRGBA }) | undefined> => {
        if (abortSignal.aborted) {
            return;
        }

        const cached = groups.groups.find((group) => group.propertyValue === value);
        if (cached) {
            return {
                ...cached,
            };
        }

        const ids = {} as { [objectId: number]: number };

        try {
            await searchDeepByPatterns({
                db,
                abortSignal,
                searchPatterns: [{ property: path, value, exact: true }],
                callbackInterval: 100_000,
                callback: (result) => {
                    result.forEach((id) => (ids[id] = id));
                },
            });

            if (abortSignal.aborted) {
                return;
            }

            return {
                ids,
                propertyValue: value,
                color: undefined,
                status: GroupStatus.None,
            };
        } catch (e) {
            if (!abortSignal.aborted) {
                console.warn(e);
                return;
            }
        }
    };

    const getGroup = async (value: string) => {
        dispatch(propertyTreeActions.setSearchStatus(AsyncStatus.Loading));

        const abortSignal = abortController.current.signal;
        const group = await search(value, abortSignal);

        dispatch(propertyTreeActions.setSearchStatus(AsyncStatus.Initial));

        if (abortSignal.aborted) {
            return;
        }

        return group;
    };

    const createGlobalObjectGroups = async () => {
        if (!containsLeaves) {
            return;
        }

        closeMenu();
        dispatch(propertyTreeActions.setGroupsCreationStatus(AsyncStatus.Loading));

        const toAdd = [] as ObjectGroup[];
        const abortSignal = abortController.current.signal;
        try {
            await pMap(
                data.values,
                async (value, idx) => {
                    const group = await search(value, abortSignal);

                    if (abortSignal.aborted) {
                        return;
                    }

                    if (!group) {
                        throw new Error(`Failed to get group for value "${value}"`);
                    }

                    const { ids, color } = group;
                    toAdd.push({
                        ids: new Set(Object.values(ids)),
                        name: value,
                        grouping: path,
                        status: GroupStatus.None,
                        search: [{ property: path, value, exact: true }],
                        color: color ?? leafColors[idx],
                        id: window.crypto.randomUUID(),
                        opacity: 0,
                        includeDescendants: true,
                    });

                    await sleep(20);
                },
                { concurrency: 1, signal: abortSignal },
            );
        } catch (e) {
            if (!abortSignal.aborted) {
                console.warn(e);
                dispatch(propertyTreeActions.setGroupsCreationStatus(AsyncStatus.Error));
            }
        }

        if (abortSignal.aborted) {
            dispatch(propertyTreeActions.setGroupsCreationStatus(AsyncStatus.Initial));
        } else {
            dispatchGroups(objectGroupsActions.add(toAdd));
            dispatch(propertyTreeActions.setGroupsCreationStatus(AsyncStatus.Success));
        }
    };

    const handleHighlightChange = (checked: boolean) =>
        checked ? updateAllGroups(GroupStatus.Selected) : dispatch(propertyTreeActions.resetAllGroupsStatus());

    const handleVisibilityChange = (checked: boolean) =>
        checked ? updateAllGroups(GroupStatus.Hidden) : dispatch(propertyTreeActions.resetAllGroupsStatus());

    const toggleFavorite = async () => {
        setFavorites({
            projectId: sceneId,
            favorites: isFavorited ? favorites.filter((fav) => fav !== path) : [...favorites, path],
        });
        closeMenu();
    };

    const isLoadingChildren = isLoadingNodeData || (containsLeaves && !leafColors.length);
    const isWidgetLoading = searchStatus === AsyncStatus.Loading || groupsCreationStatus === AsyncStatus.Loading;

    return (
        <>
            <Box pl={level === 1 ? 0 : 2} component="li">
                <ListItemButton
                    component="div"
                    dense
                    disableGutters
                    onClick={() => toggleExpand()}
                    sx={{ display: "flex", width: 1, alignItems: "center" }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            width: 0,
                            flex: "1 1 100%",
                            overflow: "hidden",
                        }}
                    >
                        <IconButton size="small" sx={{ mr: 1 }}>
                            {expanded ? (
                                <IndeterminateCheckBoxOutlined
                                    fontSize="small"
                                    color={containsLeaves ? "secondary" : "inherit"}
                                />
                            ) : (
                                <AddBoxOutlined fontSize="small" color={containsLeaves ? "secondary" : "inherit"} />
                            )}
                        </IconButton>
                        <Typography
                            noWrap={true}
                            fontWeight={600}
                            fontSize={14}
                            color={(theme) =>
                                containsLeaves ? theme.palette.text.primary : theme.palette.text.secondary
                            }
                            flex="1 1 auto"
                        >
                            {propertyName}
                        </Typography>
                    </Box>
                    {containsLeaves && (
                        <>
                            <Checkbox
                                name="toggle node highlight"
                                aria-label="toggle node highlight"
                                size="small"
                                sx={{ py: 0 }}
                                edge="end"
                                checked={groups.count.selected === data.values.length}
                                disabled={isWidgetLoading}
                                onChange={(_evt, checked) => handleHighlightChange(checked)}
                                onClick={stopPropagation}
                            />
                            <Checkbox
                                name="toggle node visibility"
                                aria-label="toggle node visibility"
                                size="small"
                                sx={{ py: 0 }}
                                edge="end"
                                icon={<Visibility />}
                                checkedIcon={<VisibilityOff color="disabled" />}
                                disabled={isWidgetLoading}
                                checked={groups.count.hidden === data.values.length}
                                onChange={(_evt, checked) => handleVisibilityChange(checked)}
                                onClick={stopPropagation}
                            />
                            <Box flex="0 0 auto" sx={{ visibility: canManage ? "visible" : "hidden" }}>
                                <IconButton
                                    sx={{ py: 0 }}
                                    aria-haspopup="true"
                                    disabled={isWidgetLoading}
                                    onClick={openMenu}
                                    onFocus={stopPropagation}
                                >
                                    <MoreVert />
                                </IconButton>
                            </Box>
                        </>
                    )}
                </ListItemButton>
                {expanded && (
                    <>
                        <Box mb={1} ml={1} mr={2} position={"relative"}>
                            {isLoadingChildren && <LinearProgress />}
                        </Box>

                        {data && (
                            <List disablePadding>
                                {"properties" in data
                                    ? data.properties.map((prop) => (
                                          <InternalNode
                                              key={prop}
                                              path={`${path}/${prop}`}
                                              propertyName={prop}
                                              level={level + 1}
                                              abortController={abortController}
                                          />
                                      ))
                                    : leafColors.length > 0 &&
                                      data.values.map((value, idx) => (
                                          <LeafNode
                                              key={value}
                                              property={path}
                                              value={value}
                                              color={leafColors[idx]}
                                              search={getGroup}
                                          />
                                      ))}
                            </List>
                        )}
                    </>
                )}
            </Box>
            <Menu
                onClick={stopPropagation}
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={closeMenu}
                id={`${propertyName}-menu`}
                MenuListProps={{ sx: { maxWidth: "100%" } }}
            >
                <MenuItem
                    disabled={searchStatus !== AsyncStatus.Initial || groupsCreationStatus !== AsyncStatus.Initial}
                    onClick={createGlobalObjectGroups}
                >
                    <ListItemIcon>
                        <Folder fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t("saveToGroups")}</ListItemText>
                </MenuItem>
                <MenuItem onClick={toggleFavorite} disabled={!isV2}>
                    <ListItemIcon>
                        <Star fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{isFavorited ? "Remove favorite" : "Favourite"}</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
}

function createColors(count: number): VecRGBA[] {
    const increment = Math.floor(360 / count);
    return Array.from({ length: count }).map((_, i) => {
        return [...hslToVec(i * increment, 1, 0.5), 1];
    });
}
