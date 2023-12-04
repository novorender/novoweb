import { ContentCopy, MoreVert, StarOutline } from "@mui/icons-material";
import {
    Box,
    Checkbox,
    FormControlLabel,
    IconButton,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Typography,
    useTheme,
} from "@mui/material";
import type { ObjectData, ObjectId } from "@novorender/webgl-api";
import { useDrag } from "@use-gesture/react";
import { ChangeEvent, ChangeEventHandler, MouseEvent, MutableRefObject, useEffect, useRef, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Divider,
    IosSwitch,
    LinearProgress,
    ScrollBox,
    Tooltip,
} from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { selectMainObject } from "features/render/renderSlice";
import { useAbortController } from "hooks/useAbortController";
import { selectHasAdminCapabilities } from "slices/explorerSlice";
import { NodeType } from "types/misc";
import {
    extractObjectIds,
    getFileNameFromPath,
    getFilePathFromObjectPath,
    getParentPath,
    getPropertyDisplayName,
} from "utils/objectData";
import {
    getObjectData as getObjectDataUtil,
    searchByPatterns,
    searchDeepByPatterns,
    searchFirstObjectAtPath,
} from "utils/search";

import { ResizeHandle } from "../resizeHandle";
import {
    propertiesActions,
    selectPropertiesStampSettings,
    selectShowPropertiesStamp,
    selectStarredProperties,
} from "../slice";

enum Status {
    Initial,
    Loading,
}

type PropertiesObject = {
    type: ObjectData["type"];
    id: ObjectId;
    base: [string, string][];
    grouped: Record<string, { name: string; properties: [string, string][] }>;
    parent?: PropertiesObject;
};

type SearchPattern = {
    property: string;
    value: string;
    deep: boolean;
    exact?: boolean;
};

export function Root() {
    const mainObject = useAppSelector(selectMainObject);
    const showStamp = useAppSelector(selectShowPropertiesStamp);
    const stampSettings = useAppSelector(selectPropertiesStampSettings);
    const dispatchHighlighted = useDispatchHighlighted();
    const {
        state: { db, view },
    } = useExplorerGlobals(true);
    const theme = useTheme();
    const dispatch = useAppDispatch();

    const [searches, setSearches] = useState<Record<string, SearchPattern>>({});
    const [status, setStatus] = useState(Status.Initial);
    const [object, setObject] = useState<PropertiesObject>();
    const [abortController, abort] = useAbortController();

    const parentObject = object?.parent;
    const [_, parentObjectName] = parentObject?.base.find(([key]) => key === "Name") ?? [];

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
        abort();
    }, [mainObject, abort]);

    useEffect(() => {
        if (mainObject === undefined) {
            setObject(undefined);
        }

        if (mainObject === undefined || !object) {
            setSearches({});
        }

        if (mainObject !== undefined && ((object && mainObject !== object.id) || !object)) {
            setSearches({});
            getObjectData(mainObject);
        }

        async function getObjectData(id: number) {
            setStatus(Status.Loading);

            const objectData = await getObjectDataUtil({ db, id, view });

            if (!objectData) {
                setObject(undefined);
                setStatus(Status.Initial);
                return;
            }

            const cleanedObjectData = { ...objectData, properties: objectData.properties.slice(0, 100) };
            const parent = navigator.onLine
                ? await searchFirstObjectAtPath({ db, path: getParentPath(objectData.path) })
                : undefined;

            if (parent) {
                const parentPropertiesObject = createPropertiesObject({
                    ...parent,
                    properties: parent.properties.slice(0, 50),
                });
                setObject({ ...createPropertiesObject(cleanedObjectData), parent: parentPropertiesObject });
            } else {
                setObject(createPropertiesObject(cleanedObjectData));
            }

            setStatus(Status.Initial);
        }
    }, [mainObject, db, object, setObject, setStatus, view]);

    const search = async (searchPatterns: SearchPattern[]) => {
        if (mainObject !== undefined) {
            const objData = await getObjectDataUtil({ db, id: mainObject, view });

            if (objData?.type === NodeType.Leaf) {
                dispatchHighlighted(highlightActions.setIds([mainObject]));
            } else {
                dispatchHighlighted(highlightActions.setIds([]));
            }
        } else {
            dispatchHighlighted(highlightActions.setIds([]));
        }

        if (!searchPatterns.length) {
            return;
        }

        setStatus(Status.Loading);
        const abortSignal = abortController.current.signal;

        try {
            const deep = searchPatterns.some((pattern) => pattern.deep);
            const baseSearchProps = {
                db,
                abortSignal,
                searchPatterns: searchPatterns.map(({ deep: _deep, ...pattern }) => pattern),
            };

            if (deep) {
                await searchDeepByPatterns({
                    ...baseSearchProps,
                    callback: (ids) => dispatchHighlighted(highlightActions.add(ids)),
                });
            } else {
                await searchByPatterns({
                    ...baseSearchProps,
                    callback: (refs) => dispatchHighlighted(highlightActions.add(extractObjectIds(refs))),
                });
            }
        } catch {
            // ignore for now
            // likely to be an aborted search which triggers a new search anyways
        } finally {
            setStatus(Status.Initial);
        }
    };

    const handleCheck = ({ property, value, deep }: Omit<SearchPattern, "exact">) => {
        const newSearches = {
            ...searches,
            [property]: {
                property,
                value,
                deep,
                exact: true,
            },
        };

        search(Object.values(newSearches));
        setSearches(newSearches);
    };

    const handleUncheck = (property: string): void => {
        const newSearches = {
            ...searches,
        };

        delete newSearches[property];

        search(Object.values(newSearches));
        setSearches(newSearches);
    };

    const handleChange =
        ({ property, value, deep }: Omit<SearchPattern, "exact">) =>
        (event: ChangeEvent<HTMLInputElement>): void => {
            abort();
            setStatus(Status.Initial);

            event.target.checked ? handleCheck({ property, value, deep }) : handleUncheck(property);
        };

    return (
        <>
            {stampSettings.enabled ? (
                <Box boxShadow={theme.customShadows.widgetHeader}>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <FormControlLabel
                        sx={{ ml: 1 }}
                        control={
                            <IosSwitch
                                size="medium"
                                color="primary"
                                checked={showStamp}
                                onChange={() => dispatch(propertiesActions.toggleShowStamp())}
                            />
                        }
                        label={
                            <Box fontSize={14} sx={{ userSelect: "none" }}>
                                Popup
                            </Box>
                        }
                    />
                </Box>
            ) : (
                <Box
                    boxShadow={theme.customShadows.widgetHeader}
                    sx={{ height: 5, width: 1, mt: "-5px" }}
                    position="absolute"
                />
            )}
            {status === Status.Loading ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : null}
            <ScrollBox pb={2} {...bindResizeHandlers()}>
                {mainObject !== undefined && object ? (
                    <>
                        <PropertyList
                            object={object}
                            handleChange={handleChange}
                            searches={searches}
                            nameWidth={propertyNameWidth}
                            resizing={resizing}
                        />
                        {parentObject ? (
                            <Accordion>
                                <AccordionSummary>
                                    <Box fontWeight={600} overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">
                                        {parentObjectName || "Parent object"}
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <PropertyList
                                        object={parentObject}
                                        handleChange={handleChange}
                                        searches={searches}
                                        nameWidth={propertyNameWidth}
                                        resizing={resizing}
                                    />
                                </AccordionDetails>
                            </Accordion>
                        ) : null}
                    </>
                ) : null}
            </ScrollBox>
        </>
    );
}

type PropertyListProps = {
    object: PropertiesObject;
    handleChange: (params: SearchPattern) => (event: ChangeEvent<HTMLInputElement>) => void;
    searches: Record<string, SearchPattern>;
    nameWidth: number;
    resizing: MutableRefObject<boolean>;
};

function PropertyList({ object, handleChange, searches, nameWidth, resizing }: PropertyListProps) {
    const theme = useTheme();

    return (
        <>
            <Box pt={1} borderBottom={`1px solid ${theme.palette.grey[200]}`}>
                <List sx={{ padding: `0 0 ${theme.spacing(1)}`, "& .propertyName": { width: nameWidth } }}>
                    {object.base
                        .filter((property) => property[1])
                        .map(([property, value], idx) => (
                            <PropertyItem
                                key={property + value + idx}
                                property={property}
                                value={value}
                                checked={searches[property] !== undefined && searches[property].value === value}
                                onChange={handleChange({ property, value, deep: object.type === NodeType.Internal })}
                                resizing={resizing}
                            />
                        ))}
                </List>
            </Box>
            {Object.values(object.grouped).map((group) => (
                <Accordion key={group.name}>
                    <AccordionSummary>
                        <Box fontWeight={600} overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">
                            {decodeURIComponent(group.name)}
                        </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                        <List sx={{ padding: 0, "& .propertyName": { width: nameWidth } }}>
                            {group.properties
                                .filter((property) => property[1])
                                .map(([property, value], idx) => (
                                    <PropertyItem
                                        key={group.name + property + value + idx}
                                        groupName={group.name}
                                        property={property}
                                        value={value}
                                        checked={
                                            searches[`${group.name}/${property}`] !== undefined &&
                                            searches[`${group.name}/${property}`].value === value
                                        }
                                        onChange={handleChange({
                                            value,
                                            property: `${group.name}/${property}`,
                                            deep: object.type === NodeType.Internal,
                                        })}
                                        resizing={resizing}
                                    />
                                ))}
                        </List>
                    </AccordionDetails>
                </Accordion>
            ))}
        </>
    );
}

type PropertyItemProps = {
    checked: boolean;
    onChange: ChangeEventHandler<HTMLInputElement>;
    property: string;
    value: string;
    groupName?: string;
    resizing: MutableRefObject<boolean>;
};

function PropertyItem({ checked, onChange, property, value, resizing, groupName }: PropertyItemProps) {
    const isUrl = value.startsWith("http");
    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const starred = useAppSelector(selectStarredProperties);
    const stampSettings = useAppSelector(selectPropertiesStampSettings);
    const dispatch = useAppDispatch();

    const checkboxRef = useRef<HTMLInputElement | null>(null);

    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

    const handleItemClick = (e: MouseEvent) => {
        if (resizing.current) {
            resizing.current = false;

            return;
        }

        if (e.target !== checkboxRef.current) {
            if (isUrl) {
                return;
            }

            checkboxRef.current?.click();
        }
    };

    const openMenu = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget.parentElement);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    const id = `${property}-${value}`;
    const displayName = getPropertyDisplayName(property);
    const fullProperty = (groupName ? groupName + "/" : "") + property;
    const isStarred = starred[fullProperty];
    return (
        <ListItemButton dense disableGutters onClick={handleItemClick}>
            <Box px={1} width={1} display="flex">
                <Box className="propertyName" flexShrink={0} display="flex" justifyContent="space-between">
                    <Tooltip title={displayName}>
                        <Typography noWrap={true}>{displayName}</Typography>
                    </Tooltip>
                    <ResizeHandle data-resize-handle>|</ResizeHandle>
                </Box>
                <Box flex="1 1 100%" width={0}>
                    <Tooltip title={value}>
                        <Typography noWrap={true}>
                            {isUrl ? (
                                <a href={value} target="_blank" rel="noreferrer">
                                    {value}
                                </a>
                            ) : property === "Path" ? (
                                getFileNameFromPath(value)
                            ) : (
                                value
                            )}
                        </Typography>
                    </Tooltip>
                </Box>
                {navigator.onLine && (
                    <Box ml={0.5} width={20} flexShrink={0}>
                        <Checkbox
                            inputRef={checkboxRef}
                            sx={{ padding: 0 }}
                            checked={checked}
                            onChange={onChange}
                            size={"small"}
                        />
                    </Box>
                )}
                <Box sx={{ ml: 1, mr: "2px", "& button": { height: 20, width: 20 } }} flexShrink={0}>
                    <Menu
                        onClick={(e) => e.stopPropagation()}
                        anchorEl={menuAnchor}
                        open={Boolean(menuAnchor)}
                        onClose={closeMenu}
                        id={id}
                        MenuListProps={{ sx: { maxWidth: "100%" } }}
                    >
                        {isAdmin && stampSettings.enabled && (
                            <MenuItem
                                onClick={() => {
                                    if (isStarred) {
                                        dispatch(propertiesActions.unStar(fullProperty));
                                    } else {
                                        dispatch(propertiesActions.star(fullProperty));
                                    }

                                    closeMenu();
                                }}
                            >
                                <ListItemIcon>
                                    <StarOutline color={isStarred ? "primary" : undefined} />
                                </ListItemIcon>
                                <ListItemText>{isStarred ? "Remove star" : "Star"} </ListItemText>
                            </MenuItem>
                        )}
                        <MenuItem
                            onClick={() =>
                                navigator.clipboard.writeText(
                                    `${groupName ? `${groupName}/${property}` : property} ${value}`
                                )
                            }
                        >
                            <ListItemIcon>
                                <ContentCopy fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Copy property</ListItemText>
                        </MenuItem>
                        <MenuItem
                            onClick={() =>
                                navigator.clipboard.writeText(groupName ? `${groupName}/${property}` : property)
                            }
                        >
                            <ListItemIcon>
                                <ContentCopy fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Copy property name</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={() => navigator.clipboard.writeText(value)}>
                            <ListItemIcon>
                                <ContentCopy fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Copy property value</ListItemText>
                        </MenuItem>
                    </Menu>
                    <IconButton
                        size="small"
                        onClick={openMenu}
                        aria-controls={id}
                        color={Boolean(menuAnchor) ? "primary" : "default"}
                        aria-haspopup="true"
                    >
                        <MoreVert />
                    </IconButton>
                </Box>
            </Box>
        </ListItemButton>
    );
}

function createPropertiesObject(object: ObjectData): PropertiesObject {
    return object.properties.reduce(
        (result, [property, value]) => {
            const path = property.split("/");

            if (path.length === 1) {
                return { ...result, base: [...result.base, [property, value] as [string, string]] };
            }

            const groupName = path.slice(0, path.length - 1).join("/");
            const propertyName = path[path.length - 1];

            if (result.grouped[groupName]) {
                return {
                    ...result,
                    grouped: {
                        ...result.grouped,
                        [groupName]: {
                            ...result.grouped[groupName],
                            properties: [
                                ...result.grouped[groupName].properties,
                                [propertyName, value] as [string, string],
                            ],
                        },
                    },
                };
            }

            return {
                ...result,
                grouped: {
                    ...result.grouped,
                    [groupName]: {
                        name: groupName,
                        properties: [[propertyName, value] as [string, string]],
                    },
                },
            };
        },
        {
            type: object.type,
            id: object.id,
            base: [
                ["Name", object.name],
                ["Path", getFilePathFromObjectPath(object.path)],
                ["Description", object.description],
            ],
            grouped: {},
        } as PropertiesObject
    );
}
