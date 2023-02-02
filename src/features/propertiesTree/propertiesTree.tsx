import { Box, CircularProgress, IconButton, List, ListItem, Typography, useTheme } from "@mui/material";
import { AddBoxOutlined, IndeterminateCheckBoxOutlined, LabelOutlined } from "@mui/icons-material";
import { useEffect, useCallback, Fragment } from "react";

import { LinearProgress, LogoSpeedDial, ScrollBox, WidgetContainer, WidgetHeader } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { useMountedState } from "hooks/useMountedState";
import { searchDeepByPatterns } from "utils/search";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { useAbortController } from "hooks/useAbortController";
import { useToggle } from "hooks/useToggle";
import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";
import { useAppSelector } from "app/store";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";

type TreeLevel = {
    properties?: TreeLevel[];
    name: string;
    path: string;
    values?: string[];
};

export default function PropertiesTree() {
    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const dispatchHighlighted = useDispatchHighlighted();
    const [abortController, abort] = useAbortController();
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.propertyTree.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.propertyTree.key;

    const [root, setRoot] = useMountedState<TreeLevel | undefined>(undefined);
    const [selected, setSelected] = useMountedState<string>("");

    const search = useCallback(
        async (property: string, value: string) => {
            abort();
            dispatchHighlighted(highlightActions.setIds([]));
            setSelected("");
            try {
                const { signal } = abortController.current;
                await searchDeepByPatterns({
                    scene,
                    searchPatterns: [{ property, value, exact: true }],
                    callback: (ids) => {
                        if (!signal.aborted) {
                            dispatchHighlighted(highlightActions.add(ids));
                        }
                    },
                    abortSignal: signal,
                });
                if (!signal.aborted) {
                    setSelected(`${encodeURIComponent(property)}=${encodeURIComponent(value)}`);
                }
            } catch {}
        },
        [scene, dispatchHighlighted, abort, abortController, setSelected]
    );

    useEffect(() => {
        init();

        async function init() {
            const url = new URL((scene as any).assetUrl);
            url.pathname += "propcache/root";
            try {
                const resp = await fetch(url.toString());
                const res: { properties?: string[] } = await resp.json();
                const properties = res.properties?.map((p) => ({ name: p, path: p })) ?? [];
                setRoot({ properties, name: "root", path: "" });
            } catch {
                setRoot({ properties: [], name: "root", path: "" });
            }
        }
    }, [scene, setRoot]);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.propertyTree} disableShadow={menuOpen} />
                <ScrollBox display={!menuOpen && !minimized ? "block" : "none"} height={1} pb={2}>
                    <List>
                        {root === undefined ? (
                            <LinearProgress />
                        ) : (
                            root.properties?.map((p) => (
                                <Node key={p.path} prop={p} level={0} selected={selected} search={search} />
                            ))
                        )}
                    </List>
                </ScrollBox>
                {menuOpen && <WidgetList widgetKey={featuresConfig.propertyTree.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.propertyTree.key}-widget-menu-fab`}
                ariaLabel="toggle widget menu"
            />
        </>
    );
}

type ValueProps = {
    prop: string;
    value: string;
    level: number;
    selected: string;
    search: (property: string, value: string) => Promise<void>;
};

function Value({ prop, value, level, selected, search }: ValueProps) {
    const theme = useTheme();
    const [selecting, setSelecting] = useMountedState<boolean>(false);

    const clickValue = useCallback(async () => {
        setSelecting(true);
        await search(prop, value);
        setSelecting(false);
    }, [setSelecting, prop, value, search]);

    return (
        <ListItem
            sx={{
                padding: `0 ${theme.spacing(1)} 0 ${theme.spacing(level * 3 + 1)}`,
            }}
            button
            onClick={clickValue}
        >
            <Box display="flex" width={1} alignItems="center">
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        width: 0,
                        flex: "1 1 100%",
                        position: "relative",

                        "& > svg": {
                            marginRight: theme.spacing(1),
                        },
                    }}
                >
                    <LabelOutlined
                        fontSize="small"
                        color={
                            selected === `${encodeURIComponent(prop)}=${encodeURIComponent(value)}`
                                ? "primary"
                                : undefined
                        }
                    />
                    {selecting ? (
                        <CircularProgress
                            size={24}
                            // color="primary"
                            sx={{
                                position: "absolute",
                                top: 0,
                                left: -3,
                                zIndex: 1,
                            }}
                        />
                    ) : undefined}
                    <Typography noWrap variant="body1" sx={{ fontWeight: 600 }}>
                        {value}
                    </Typography>
                </Box>
            </Box>
        </ListItem>
    );
}
type NodeProps = {
    prop: TreeLevel;
    level: number;
    selected: string;
    search: (property: string, value: string) => Promise<void>;
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

function Node({ prop, level, selected, search }: NodeProps) {
    const theme = useTheme();

    const {
        state: { scene },
    } = useExplorerGlobals(true);

    const [expanded, setExpanded] = useMountedState<boolean | undefined>(undefined);

    const clickProp = useCallback(async () => {
        if (expanded !== undefined) {
            setExpanded(!expanded);
        } else {
            const url = new URL((scene as any).assetUrl);
            let { path } = prop;
            for (const ic of invalidCharacters) {
                path = path.replaceAll(ic[0], ic[1]);
            }
            url.pathname += "propcache/" + path.toLowerCase();
            setExpanded(false);
            try {
                const resp = await fetch(url.toString());
                const res: { properties?: string[]; values?: string[] } = await resp.json();
                prop.properties = res.properties?.map((p) => ({ name: p, path: prop.path + "/" + p })) ?? [];
                prop.values = res.values ?? [];
            } catch {
                prop.properties = [];
                prop.values = [];
            }
            setExpanded(true);
        }
    }, [scene, expanded, setExpanded, prop]);

    return (
        <Fragment>
            <ListItem
                sx={{
                    padding: `0 ${theme.spacing(1)} 0 ${theme.spacing(level * 3 + 1)}`,
                }}
            >
                <Box display="flex" width={1} alignItems="center" sx={{ position: "relative" }}>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            width: 0,
                            flex: "1 1 100%",

                            "& svg": {
                                minWidth: "auto",
                                margin: `0 ${theme.spacing(1)} 0 0`,
                                color: theme.palette.grey[700],
                            },
                        }}
                    >
                        <IconButton
                            size="small"
                            onClick={clickProp}
                            disabled={expanded === false && prop.values === undefined}
                        >
                            {expanded ? (
                                <IndeterminateCheckBoxOutlined fontSize="small" />
                            ) : (
                                <AddBoxOutlined fontSize="small" />
                            )}
                        </IconButton>
                        <Typography noWrap variant="body1" sx={{ fontWeight: 600 }}>
                            {prop.name}
                        </Typography>
                    </Box>
                    {/* <Checkbox
                            aria-label="Select node"
                            size="small"
                            checked={selected}
                            onChange={(e) => handleChange("select")(e, node)}
                            onClick={stopPropagation}
                        />
                        <Checkbox
                            aria-label="Toggle node visibility"
                            size="small"
                            icon={<VisibilityIcon />}
                            checkedIcon={<VisibilityIcon color="disabled" />}
                            checked={hidden}
                            onChange={(e) => handleChange("hide")(e, node)}
                            onClick={stopPropagation}
                        /> */}
                    {expanded === false && prop.values === undefined ? (
                        <LinearProgress sx={{ bottom: 0, left: 0, right: 0, width: "unset" }} />
                    ) : undefined}
                </Box>
            </ListItem>
            {expanded ? (
                <>
                    {prop.properties?.map((p) => (
                        <Node key={p.path} prop={p} level={level + 1} selected={selected} search={search} />
                    ))}
                    {prop.values?.map((v, i) => (
                        <Value
                            key={i}
                            prop={prop.path}
                            value={v}
                            level={level + 1}
                            selected={selected}
                            search={search}
                        />
                    ))}
                </>
            ) : undefined}
        </Fragment>
    );
}
