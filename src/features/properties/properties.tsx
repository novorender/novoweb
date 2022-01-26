import { useState, useRef, useEffect, ChangeEvent, ChangeEventHandler, MouseEvent, MutableRefObject } from "react";
import {
    useTheme,
    Box,
    List,
    ListItem,
    Typography,
    Checkbox,
    styled,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
} from "@mui/material";
import type { ObjectData, ObjectId } from "@novorender/webgl-api";
import { css } from "@mui/styled-engine";
import { useDrag } from "@use-gesture/react";
import { ContentCopy, MoreVert } from "@mui/icons-material";

import {
    LinearProgress,
    ScrollBox,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Tooltip,
    WidgetContainer,
    WidgetHeader,
    LogoSpeedDial,
} from "components";
import { selectMainObject } from "slices/renderSlice";
import { useAppSelector } from "app/store";
import { useAbortController } from "hooks/useAbortController";
import { useMountedState } from "hooks/useMountedState";
import { useToggle } from "hooks/useToggle";
import {
    getObjectData as getObjectDataUtil,
    searchFirstObjectAtPath,
    searchByPatterns,
    searchDeepByPatterns,
} from "utils/search";
import { extractObjectIds, getParentPath } from "utils/objectData";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { NodeType } from "features/modelTree/modelTree";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";

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

export function Properties() {
    const mainObject = useAppSelector(selectMainObject);
    const dispatchHighlighted = useDispatchHighlighted();
    const {
        state: { scene },
    } = useExplorerGlobals(true);

    const [menuOpen, toggleMenu] = useToggle();
    const [searches, setSearches] = useState<Record<string, SearchPattern>>({});
    const [status, setStatus] = useMountedState(Status.Initial);
    const [object, setObject] = useMountedState<PropertiesObject | undefined>(undefined);
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

            const objectData = await getObjectDataUtil({ scene, id });

            if (!objectData) {
                setObject(undefined);
                setStatus(Status.Initial);
                return;
            }

            const cleanedObjectData = { ...objectData, properties: objectData.properties.slice(0, 100) };
            const parent = await searchFirstObjectAtPath({ scene, path: getParentPath(objectData.path) });

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
    }, [mainObject, scene, object, setObject, setStatus]);

    const search = async (searchPatterns: SearchPattern[]) => {
        if (mainObject !== undefined) {
            const objData = await getObjectDataUtil({ scene, id: mainObject });

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
                scene,
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
            <WidgetContainer>
                <WidgetHeader widget={featuresConfig.properties} />
                <ScrollBox
                    display={menuOpen ? "none" : "flex"}
                    flexDirection={"column"}
                    height={1}
                    pb={2}
                    {...bindResizeHandlers()}
                >
                    {status === Status.Loading ? <LinearProgress /> : null}
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
                                        <Box
                                            fontWeight={600}
                                            overflow="hidden"
                                            whiteSpace="nowrap"
                                            textOverflow="ellipsis"
                                        >
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
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.properties.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.properties.key}-widget-menu-fab`}
            />
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
                            {group.name}
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

const ResizeHandle = styled("div")(
    () => css`
        padding: 0 4px;
        cursor: col-resize;
        touch-action: none;
    `
);

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

    return (
        <ListItem button dense disableGutters onClick={handleItemClick}>
            <Box px={1} width={1} display="flex">
                <Box className="propertyName" flexShrink={0} display="flex" justifyContent="space-between">
                    <Tooltip title={property}>
                        <Typography noWrap={true}>{property}</Typography>
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
                            ) : (
                                value
                            )}
                        </Typography>
                    </Tooltip>
                </Box>
                <Box ml={0.5} width={20} flexShrink={0}>
                    <Checkbox
                        inputRef={checkboxRef}
                        sx={{ padding: 0 }}
                        checked={checked}
                        onChange={onChange}
                        size={"small"}
                    />
                </Box>
                <Box sx={{ ml: 1, mr: "2px", "& button": { height: 20, width: 20 } }} flexShrink={0}>
                    <Menu
                        onClick={(e) => e.stopPropagation()}
                        anchorEl={menuAnchor}
                        open={Boolean(menuAnchor)}
                        onClose={closeMenu}
                        id={id}
                        MenuListProps={{ sx: { maxWidth: "100%" } }}
                    >
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
        </ListItem>
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
                ["Description", object.description],
            ],
            grouped: {},
        } as PropertiesObject
    );
}
