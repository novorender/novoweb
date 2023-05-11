import { ArrowBack, KeyboardArrowDown, KeyboardArrowRight, Save } from "@mui/icons-material";
import { Box, Button, Checkbox, FormControlLabel, List, ListItemButton, Typography, useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { Scene } from "@novorender/webgl-api";

import { Divider, IosSwitch, LinearProgress, ScrollBox } from "components";
import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { propertiesActions, selectPropertiesStampSettings } from "../slice";
import { getAssetUrl } from "utils/misc";
import { AsyncState, AsyncStatus } from "types/misc";

type TreeLevel = {
    properties?: TreeLevel[];
    name: string;
    path: string;
};

const baseProperties = ["Name", "Path", "GUID"];

// NOTE(OLA): Needs more work before this can replace current settings
// Virtualized tree
// Store properties as record for fast state access

export function StampSettings() {
    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const theme = useTheme();
    const history = useHistory();
    const dispatch = useAppDispatch();
    const settings = useAppSelector(selectPropertiesStampSettings);
    const [rootProperties, setRootProperties] = useState<TreeLevel[]>();

    useEffect(() => {
        init();

        async function init() {
            const url = getAssetUrl(scene, "propcache/root");
            try {
                const res: { properties?: string[] } = await fetch(url.toString()).then((res) => res.json());
                const properties = res.properties?.map((p) => ({ name: p, path: p })) ?? [];
                setRootProperties(properties);
            } catch {
                setRootProperties([]);
            }
        }
    }, [scene]);

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex" justifyContent="space-between">
                    <Button onClick={() => history.goBack()} color="grey">
                        <ArrowBack sx={{ mr: 1 }} />
                        Back
                    </Button>
                    <FormControlLabel
                        sx={{ ml: 2 }}
                        control={
                            <IosSwitch
                                size="medium"
                                color="primary"
                                checked={settings.enabled}
                                onChange={() => dispatch(propertiesActions.toggleEnableStamp())}
                            />
                        }
                        label={
                            <Box fontSize={14} sx={{ userSelect: "none" }}>
                                Enabled
                            </Box>
                        }
                    />
                    <Button onClick={() => {}} color="grey">
                        <Save sx={{ mr: 1 }} />
                        Save
                    </Button>
                </Box>
            </Box>
            {!rootProperties && (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            )}
            <ScrollBox pb={3}>
                <List dense disablePadding>
                    <Node prop={{ name: "Name", path: "Name" }} level={0} />
                    <Node prop={{ name: "Path", path: "Path" }} level={0} />
                    <Node prop={{ name: "GUID", path: "GUID" }} level={0} />
                    {rootProperties?.map((p) => (
                        <Node key={p.path} prop={p} level={0} />
                    ))}
                </List>
            </ScrollBox>
        </>
    );
}

type NodeProps = {
    prop: TreeLevel;
    level: number;
};

const invalidCharacters = [
    ['"', "%22"],
    ["<", "%3c"],
    [">", "%3e"],
    ["|", "%7c"],
    [":", "%3a"],
    ["*", "%2a"],
    ["?", "%3f"],
    ["\\", "%5c"],
    ["/", "%2f"],
    ["=", "%3d"],
    ["+", "%2b"],
    [" ", "+"],
    ["%", "%25"],
];

function Node({ prop, level }: NodeProps) {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const selectedProperties = useAppSelector(selectPropertiesStampSettings).properties;
    const [subProperties, setSubProperties] = useState<AsyncState<TreeLevel[]>>({ status: AsyncStatus.Initial });
    const [isLeaf, setIsLeaf] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [selected, setSelected] = useState(false);

    useEffect(() => {
        setIsLeaf(
            (subProperties.status === AsyncStatus.Success && !subProperties.data.length) ||
                baseProperties.includes(prop.name)
        );
    }, [subProperties, prop.name]);

    useEffect(() => {
        if (isLeaf) {
            setSelected(selectedProperties.includes(prop.path));
        } else if (subProperties.status === AsyncStatus.Success) {
            setSelected(subProperties.data.every((p) => selectedProperties.includes(p.path)));
        }
    }, [isLeaf, selected, subProperties, prop.path, selectedProperties]);

    useEffect(() => {
        loadSubProperties();

        async function loadSubProperties() {
            if ((!expanded && level === 0) || subProperties?.status !== AsyncStatus.Initial) {
                return;
            }

            setSubProperties({ status: AsyncStatus.Loading });
            try {
                setSubProperties({ status: AsyncStatus.Success, data: await loadProperties(scene, prop.path) });
            } catch (e) {
                console.warn(e);
                setSubProperties({ status: AsyncStatus.Error, msg: "An error occurred." });
            }
        }
    }, [scene, expanded, subProperties, prop.path, level]);

    const properties = subProperties.status === AsyncStatus.Success ? subProperties.data : [];
    const disabled = ![AsyncStatus.Initial, AsyncStatus.Success].includes(subProperties.status);
    return (
        <>
            <ListItemButton
                disableGutters
                sx={{
                    px: 1,
                    pl: level ? level * 3 : 1,
                }}
                onClick={() => {
                    if (isLeaf) {
                        if (!selected) {
                            dispatch(propertiesActions.addStampProperties(prop.path));
                        } else {
                            dispatch(propertiesActions.removeStampProperties(prop.path));
                        }
                    } else {
                        setExpanded((state) => !state);
                    }
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        width: 0,
                        flex: "1 1 100%",

                        "& svg": {
                            minWidth: "auto",
                            margin: `0 ${theme.spacing(1)} 0 0`,
                        },
                    }}
                >
                    {expanded && !isLeaf ? (
                        <KeyboardArrowDown fontSize="small" />
                    ) : (
                        <KeyboardArrowRight htmlColor={isLeaf ? theme.palette.grey[400] : undefined} fontSize="small" />
                    )}
                    <Typography noWrap>{prop.name}</Typography>
                </Box>
                <Checkbox
                    aria-label={"Select property"}
                    size="small"
                    sx={{ py: 0 }}
                    checked={selected}
                    onChange={async (e, checked) => {
                        if (disabled) {
                            return;
                        }

                        if (isLeaf) {
                            if (checked) {
                                dispatch(propertiesActions.addStampProperties(prop.path));
                            } else {
                                dispatch(propertiesActions.removeStampProperties(prop.path));
                            }
                        } else {
                            if (subProperties.status === AsyncStatus.Success) {
                                const paths = subProperties.data.map((p) => p.path);

                                if (checked) {
                                    dispatch(propertiesActions.addStampProperties(paths));
                                } else {
                                    dispatch(propertiesActions.removeStampProperties(paths));
                                }
                            } else if (subProperties.status === AsyncStatus.Initial) {
                                setSubProperties({ status: AsyncStatus.Loading });
                                try {
                                    const res = await loadProperties(scene, prop.path);
                                    const paths = res.map((p) => p.path);

                                    if (paths.length) {
                                        dispatch(propertiesActions.addStampProperties(paths));
                                    } else {
                                        dispatch(propertiesActions.addStampProperties(prop.path));
                                    }
                                    setSubProperties({
                                        status: AsyncStatus.Success,
                                        data: res,
                                    });
                                } catch (e) {
                                    console.warn(e);
                                    setSubProperties({ status: AsyncStatus.Error, msg: "An error occurred." });
                                }
                            }
                        }
                    }}
                    onClick={(e) => e.stopPropagation()}
                />
            </ListItemButton>
            <Box display={expanded ? "block" : "none"}>
                {properties.map((p) => (
                    <Node key={p.path} prop={p} level={level + 1} />
                ))}
            </Box>
        </>
    );
}

async function loadProperties(scene: Scene, path: string): Promise<TreeLevel[]> {
    let escapedPath = path.toLowerCase();
    for (const ic of invalidCharacters) {
        escapedPath = escapedPath.replaceAll(ic[0], ic[1]);
    }
    const url = getAssetUrl(scene, `propcache/${escapedPath}`);
    const res: { properties?: string[]; values?: string[] } = await fetch(url.toString()).then((res) => {
        if (!res.ok) {
            throw new Error(`Error fetching properies under ${escapedPath}`);
        }
        return res.json();
    });

    return res.properties?.map((p) => ({ name: p, path: path + "/" + p })) ?? [];
}
