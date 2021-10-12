import { useState, useRef, useEffect, ChangeEvent, ChangeEventHandler } from "react";
import { useTheme, Box, List, ListItem, Grid, Typography, Checkbox, makeStyles } from "@material-ui/core";
import type { ObjectData, ObjectId, Scene } from "@novorender/webgl-api";

import { LinearProgress, ScrollBox, Accordion, AccordionSummary, AccordionDetails, Tooltip } from "components";
import { selectMainObject } from "slices/renderSlice";
import { useAppSelector } from "app/store";
import { useAbortController } from "hooks/useAbortController";
import { useMountedState } from "hooks/useMountedState";
import { getObjectData as getObjectDataUtil, searchFirstObjectAtPath, searchByPatterns } from "utils/search";
import { extractObjectIds, getParentPath } from "utils/objectData";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { NodeType } from "features/modelTree/modelTree";

const useStyles = makeStyles({
    checkbox: {
        padding: 0,
    },
});

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

type Props = {
    scene: Scene;
};

export function Properties({ scene }: Props) {
    const mainObject = useAppSelector(selectMainObject);
    const dispatchHighlighted = useDispatchHighlighted();

    const [searches, setSearches] = useState<Record<string, SearchPattern>>({});
    const [status, setStatus] = useMountedState(Status.Initial);
    const [object, setObject] = useMountedState<PropertiesObject | undefined>(undefined);
    const [abortController, abort] = useAbortController();

    const parentObject = object?.parent;
    const [_, parentObjectName] = parentObject?.base.find(([key]) => key === "Name") ?? [];

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

            const parent = await searchFirstObjectAtPath({ scene, path: getParentPath(objectData.path) });

            if (parent) {
                const parentPropertiesObject = createPropertiesObject(parent);
                setObject({ ...createPropertiesObject(objectData), parent: parentPropertiesObject });
            } else {
                setObject(createPropertiesObject(objectData));
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
            await searchByPatterns({
                scene,
                abortSignal,
                searchPatterns: searchPatterns.map(({ deep: _deep, ...pattern }) => pattern),
                deep: searchPatterns.some((pattern) => pattern.deep),
                callbackInterval: 1000,
                callback: (refs) => dispatchHighlighted(highlightActions.add(extractObjectIds(refs))),
            });
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

    if (mainObject === undefined || !object) {
        return status === Status.Loading ? <LinearProgress /> : null;
    }

    return (
        <ScrollBox height={1} pb={2}>
            {status === Status.Loading ? <LinearProgress /> : null}
            <PropertyList object={object} handleChange={handleChange} searches={searches} />
            {parentObject ? (
                <Accordion>
                    <AccordionSummary>
                        <Box fontWeight={600} overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">
                            {parentObjectName || "Parent object"}
                        </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                        <PropertyList object={parentObject} handleChange={handleChange} searches={searches} />
                    </AccordionDetails>
                </Accordion>
            ) : null}
        </ScrollBox>
    );
}

type PropertyListProps = {
    object: PropertiesObject;
    handleChange: (params: SearchPattern) => (event: ChangeEvent<HTMLInputElement>) => void;
    searches: Record<string, SearchPattern>;
};

function PropertyList({ object, handleChange, searches }: PropertyListProps) {
    const theme = useTheme();

    return (
        <>
            <Box borderBottom={`1px solid ${theme.palette.grey[200]}`}>
                <List>
                    {object.base
                        .filter((property) => property[1])
                        .map(([property, value]) => (
                            <PropertyItem
                                key={property}
                                property={property}
                                value={value}
                                checked={searches[property] !== undefined && searches[property].value === value}
                                onChange={handleChange({ property, value, deep: object.type === NodeType.Internal })}
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
                        {group.properties
                            .filter((property) => property[1])
                            .map(([property, value]) => (
                                <PropertyItem
                                    key={property}
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
                                />
                            ))}
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
};

function PropertyItem({ checked, onChange, property, value }: PropertyItemProps) {
    const classes = useStyles();
    const checkboxRef = useRef<HTMLInputElement | null>(null);

    return (
        <ListItem
            button
            dense
            disableGutters
            onClick={(e) => {
                if (e.target !== checkboxRef.current) {
                    checkboxRef.current?.click();
                }
            }}
        >
            <Box px={1} width={1}>
                <Grid container alignItems="center" spacing={1} key={property}>
                    <Grid item xs={3}>
                        <Tooltip title={property} interactive>
                            <Typography noWrap={true}>{property}</Typography>
                        </Tooltip>
                    </Grid>
                    <Grid item xs={8}>
                        <Tooltip title={value} interactive>
                            <Typography noWrap={true}>{value}</Typography>
                        </Tooltip>
                    </Grid>
                    <Grid item xs={1}>
                        <Checkbox
                            inputRef={checkboxRef}
                            className={classes.checkbox}
                            checked={checked}
                            onChange={onChange}
                            size={"small"}
                        />
                    </Grid>
                </Grid>
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
