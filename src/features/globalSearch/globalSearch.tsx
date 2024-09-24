import { AcUnit, Check, Visibility, VisibilityOff } from "@mui/icons-material";
import {
    Autocomplete,
    Box,
    Button,
    Chip,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    TextField,
    Tooltip,
    Typography,
    useTheme,
} from "@mui/material";
import { Bookmark } from "@novorender/data-js-api";
import { HierarcicalObjectReference, SearchPattern } from "@novorender/webgl-api";
import { Fragment, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { LinearProgress } from "components";
import { HudPanel } from "components/hudPanel";
import { featuresConfig, Widget, WidgetKey } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import {
    GroupStatus,
    isInternalGroup,
    ObjectGroup,
    objectGroupsActions,
    useDispatchObjectGroups,
    useObjectGroups,
} from "contexts/objectGroups";
import { selectBookmarks, useSelectBookmark } from "features/bookmarks";
import { useInitBookmarks } from "features/bookmarks/useInitBookmarks";
import { groupsActions } from "features/groups";
import { renderActions } from "features/render";
import useFlyTo from "hooks/useFlyTo";
import { useOpenWidget } from "hooks/useOpenWidget";
import { selectEnabledWidgets } from "slices/explorer";
import { vecToRgb } from "utils/color";
import { compareStrings } from "utils/misc";

enum Category {
    Group = "group",
    Bookmark = "bookmark",
    Object = "object",
    Widget = "widget",
    // Property = "property",
}

export function GlobalSearch() {
    const [show, setShow] = useState(false);
    const [term, setTerm] = useState("");
    const [categories, setCategories] = useState([Category.Group, Category.Bookmark, Category.Object, Category.Widget]);
    const inputRef = useRef<HTMLDivElement | null>(null);

    const widgetOptions = useWidgetOptions();
    const groupOptions = useGroupOptions();
    const bookmarkOptions = useBookmarkOptions(!show || !term);
    const [objectOptions, loadingObjectOptions] = useObjectOptions(
        categories.includes(Category.Object) && show ? term : "",
    );
    const openWidget = useOpenWidget();
    const selectBookmark = useSelectBookmark();
    const dispatch = useAppDispatch();
    const flyTo = useFlyTo();

    const cleanTerm = term.trim().toLowerCase();

    const focusInput = () => {
        setTimeout(() => {
            inputRef.current?.querySelector("input")?.focus();
        }, 100);
    };

    const hide = useCallback(() => {
        setShow(false);
        setTerm("");
    }, []);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (!show && (e.ctrlKey || e.metaKey) && e.code === "KeyK") {
                setShow(true);
                focusInput();
            }
            if (show && e.code === "Escape") {
                hide();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [show, hide]);

    const loading = loadingObjectOptions;

    const options = useMemo(() => {
        const allOptions = [
            ...(categories.includes(Category.Widget) ? widgetOptions : []),
            ...(categories.includes(Category.Group) ? groupOptions : []),
            ...(categories.includes(Category.Bookmark) ? bookmarkOptions : []),
            ...(categories.includes(Category.Object) ? objectOptions : []),
        ];

        return allOptions.sort((a, b) => compareStrings(a.label, b.label)) as Option[];
    }, [widgetOptions, groupOptions, bookmarkOptions, objectOptions, categories]);

    const onSelect = useCallback(
        (newValue: string | Option | null) => {
            if (!newValue || typeof newValue === "string") {
                return;
            }

            switch (newValue.category) {
                case Category.Widget: {
                    openWidget(newValue.widget.key);
                    break;
                }
                case Category.Group: {
                    openWidget(featuresConfig.groups.key);
                    dispatch(groupsActions.setHighlightGroupInWidget(newValue.group.id));
                    dispatch(groupsActions.expandCollection(newValue.group.grouping));
                    break;
                }
                case Category.Bookmark: {
                    selectBookmark(newValue.bookmark);
                    break;
                }
                case Category.Object: {
                    dispatch(renderActions.setMainObject(newValue.object.id));
                    newValue.object.loadMetaData().then((data) => {
                        const sphere = data.bounds?.sphere;
                        if (sphere) {
                            flyTo({ sphere });
                        }
                    });
                    break;
                }
            }

            hide();
        },
        [openWidget, selectBookmark, dispatch, flyTo, hide],
    );

    if (!show) {
        return null;
    }

    return (
        <Box
            sx={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                background: "rgba(0, 0, 0, 0.4)",
                zIndex: 2000,
            }}
            id="global-search-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    hide();
                }
            }}
        >
            <HudPanel sx={{ width: "70%", maxWidth: "800px", p: 2, mt: "-20%" }}>
                <Box sx={{ display: "flex", gap: 1 }}>
                    <Box sx={{ position: "relative", flex: "auto" }}>
                        <Autocomplete
                            options={options}
                            onChange={(_, newValue) => onSelect(newValue)}
                            disablePortal
                            autoComplete
                            // freeSolo
                            onInputChange={(_, newInputValue) => {
                                setTerm(newInputValue);
                            }}
                            ref={inputRef}
                            filterOptions={(opts) =>
                                opts.filter((opt) => {
                                    if (opt.category === Category.Object) {
                                        return opt;
                                    }
                                    return opt.label.toLowerCase().includes(cleanTerm);
                                })
                            }
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Search"
                                    onBlur={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                    }}
                                />
                            )}
                            renderOption={({ key: _key, ...props }, option) => (
                                <li key={option.id} {...props}>
                                    <SearchOption option={option} term={cleanTerm} />
                                </li>
                            )}
                        />
                        {loading && (
                            <LinearProgress
                                sx={{ translate: "0 -4px", borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }}
                            />
                        )}
                    </Box>
                    <CategorySelect
                        categories={categories}
                        onChange={(categories) => {
                            setCategories(categories);
                            focusInput();
                        }}
                    />
                </Box>
            </HudPanel>
        </Box>
    );
}

function CategorySelect({
    categories,
    onChange,
}: {
    categories: Category[];
    onChange: (categories: Category[]) => void;
}) {
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [state, setState] = useState(categories);

    useEffect(() => {
        setState(categories);
    }, [categories]);

    const closeMenu = () => {
        setMenuAnchor(null);
        onChange(state);
    };

    const allCategories = [Category.Widget, Category.Group, Category.Bookmark, Category.Object];

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.code === "Escape") {
                closeMenu();
                e.preventDefault();
            }
        }
        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
        };
    });

    return (
        <>
            <Button color="grey" onClick={(e) => setMenuAnchor(e.currentTarget)}>
                what
            </Button>
            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu} disablePortal>
                {allCategories.map((c) => {
                    const checked = state.includes(c);

                    return (
                        <MenuItem
                            key={c}
                            onClick={() => {
                                if (checked) {
                                    setState(state.filter((c2) => c2 !== c));
                                } else {
                                    setState([...state, c]);
                                }
                            }}
                        >
                            {checked && (
                                <ListItemIcon>
                                    <Check />
                                </ListItemIcon>
                            )}
                            <ListItemText inset={!checked}>{c}</ListItemText>
                        </MenuItem>
                    );
                })}
            </Menu>
        </>
    );
}

type Option =
    | { id: WidgetKey; label: string; widget: Widget; category: Category.Widget }
    | { id: string; label: string; group: ObjectGroup; category: Category.Group }
    | { id: string; label: string; bookmark: Bookmark; category: Category.Bookmark }
    | OptionObject;

type OptionObject = {
    id: string;
    label: string;
    object: HierarcicalObjectReference;
    match?: string;
    category: Category.Object;
};

function SearchOption({ option, term }: { option: Option; term: string }) {
    const theme = useTheme();
    let addon: ReactNode | null = null;
    let sublabel: ReactNode | null = null;
    const dispatchObjectGroups = useDispatchObjectGroups();

    let title = "";
    switch (option.category) {
        case Category.Widget: {
            addon = <option.widget.Icon color="disabled" />;
            break;
        }
        case Category.Group: {
            const { group } = option;
            const { r, g, b, a } = vecToRgb(group.color);

            const icon = (
                <IconButton
                    onClick={(e) => {
                        e.stopPropagation();
                        dispatchObjectGroups(
                            objectGroupsActions.update(group.id, {
                                status: group.status === GroupStatus.Hidden ? GroupStatus.None : GroupStatus.Hidden,
                            }),
                        );
                    }}
                >
                    {group.status === GroupStatus.Frozen ? (
                        <AcUnit />
                    ) : group.status === GroupStatus.Hidden ? (
                        <VisibilityOff />
                    ) : (
                        <Visibility htmlColor={`rgba(${r}, ${g}, ${b}, ${Math.max(a ?? 0, 0.2)})`} />
                    )}
                </IconButton>
            );

            addon = <>{icon}</>;

            if (group.grouping) {
                sublabel = (
                    <Typography fontSize="small" noWrap color={theme.palette.grey[600]}>
                        Collection {group.grouping}
                    </Typography>
                );
            }

            break;
        }
        case Category.Object: {
            title = option.object.path;
            if (option.match) {
                sublabel = (
                    <Typography fontSize="small" noWrap color={theme.palette.grey[600]}>
                        <Highlight text={option.match} term={term} />
                    </Typography>
                );
            }
        }
    }

    return (
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", width: "100%" }}>
            <Chip label={option.category} sx={{ flex: "0 0 100px" }} />
            <Tooltip title={title} PopperProps={{ disablePortal: true }}>
                <Box flex="auto">
                    <Highlight text={option.label} term={term} />
                    {sublabel}
                </Box>
            </Tooltip>
            {addon}
        </Box>
    );
}

function useWidgetOptions() {
    const widgets = useAppSelector(selectEnabledWidgets);
    const { t } = useTranslation();

    return useMemo(() => {
        return widgets.map((w) => ({
            id: `widget-${w.key}`,
            label: t(w.nameKey),
            widget: w,
            category: Category.Widget as const,
        }));
    }, [t, widgets]);
}

function useGroupOptions() {
    const objectGroups = useObjectGroups();

    return useMemo(() => {
        return objectGroups
            .filter((grp) => !isInternalGroup(grp))
            .map((g) => ({
                id: g.id,
                label: g.name,
                group: g,
                category: Category.Group as const,
            }));
    }, [objectGroups]);
}

function useBookmarkOptions(skip: boolean) {
    useInitBookmarks({ skip });
    const bookmarks = useAppSelector(selectBookmarks);

    return useMemo(() => {
        return bookmarks.map((bm) => ({
            id: bm.id,
            label: bm.name,
            bookmark: bm,
            category: Category.Bookmark as const,
        }));
    }, [bookmarks]);
}

const emptyObjectOptions: OptionObject[] = [];

function useObjectOptions(term: string) {
    const {
        state: { db },
    } = useExplorerGlobals(false);
    const [objects, setObjects] = useState<OptionObject[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const cleanTerm = term.trim().toLowerCase();
        if (cleanTerm.length < 3) {
            setObjects(emptyObjectOptions);
            setLoading(false);
            return;
        }

        const state = {
            timeout: null as null | ReturnType<typeof setTimeout>,
            abortController: null as null | AbortController,
        };

        state.timeout = setTimeout(() => {
            state.timeout = null;
            search(cleanTerm);
        }, 1000);

        async function search(term: string) {
            if (!db) {
                return;
            }

            const abort = new AbortController();
            state.abortController = abort;

            setLoading(true);
            let searchPattern: SearchPattern[] | string;
            if (term.includes("=")) {
                const [property, rawValue] = term.split("=", 2).map((e) => e.trim());
                let exact = false;
                let value = rawValue;
                if (value.endsWith("!")) {
                    exact = true;
                    value = value.slice(0, value.length - 1);
                }
                searchPattern = [{ property, value, exact }];
            } else {
                searchPattern = term;
            }

            setLoading(true);

            const iter = db.search(
                {
                    searchPattern,
                    full: true,
                },
                abort.signal,
            );

            const result: OptionObject[] = [];
            for await (const obj of iter) {
                const meta = await obj.loadMetaData();

                let match: string | undefined = undefined;
                if (typeof searchPattern === "string") {
                    if (!meta.name.toLowerCase().includes(searchPattern)) {
                        const prop = meta.properties.find(
                            (p) =>
                                p[0].toLowerCase().includes(searchPattern) ||
                                p[1].toLowerCase().includes(searchPattern),
                        );
                        if (prop) {
                            match = `${prop[0]}=${prop[1]}`;
                        }
                    }
                } else {
                    const prop = meta.properties.find((p) => p[0] === searchPattern[0].property);
                    if (prop) {
                        match = `${prop[0]}=${prop[1]}`;
                    }
                }

                result.push({
                    id: `object-${obj.id}`,
                    label: meta.name,
                    object: obj,
                    match,
                    category: Category.Object,
                });

                if (result.length >= 100) {
                    break;
                }
            }

            state.abortController = null;
            setObjects(result);
            setLoading(false);
        }

        return () => {
            if (state.timeout) {
                clearTimeout(state.timeout);
            }
            state.abortController?.abort();
            setLoading(false);
        };
    }, [db, term]);

    return useMemo(() => [objects, loading] as const, [objects, loading]);
}

function Highlight({ text, term }: { text: string; term: string }) {
    const parts: { text: string; highlight: boolean }[] = [];
    let pos = 0;

    if (!term) {
        return text;
    }

    const cleanText = text.toLowerCase();
    for (;;) {
        const nextPos = cleanText.indexOf(term, pos);
        if (nextPos === -1) {
            parts.push({ text: text.slice(pos), highlight: false });
            break;
        }
        parts.push({ text: text.slice(pos, nextPos), highlight: false });
        parts.push({ text: text.slice(nextPos, nextPos + term.length), highlight: true });
        pos = nextPos + term.length;
    }

    return (
        <>
            {parts.map(({ text, highlight }, i) =>
                highlight ? (
                    <span key={i} style={{ fontWeight: "bold" }}>
                        {text}
                    </span>
                ) : (
                    <Fragment key={i}>{text}</Fragment>
                ),
            )}
        </>
    );
}
