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
import { Fragment, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch } from "app/redux-store-interactions";
import { LinearProgress } from "components";
import { HudPanel } from "components/hudPanel";
import { featuresConfig } from "config/features";
import { GroupStatus, objectGroupsActions, useDispatchObjectGroups } from "contexts/objectGroups";
import { useSelectBookmark } from "features/bookmarks";
import { deviationsActions } from "features/deviations";
import { groupsActions } from "features/groups";
import { renderActions } from "features/render";
import { useShareLink } from "features/shareLink/useShareLink";
import useFlyTo from "hooks/useFlyTo";
import { useOpenWidget } from "hooks/useOpenWidget";
import { explorerActions } from "slices/explorer";
import { ViewMode } from "types/misc";
import { vecToRgb } from "utils/color";
import { compareStrings } from "utils/misc";

import { useBookmarkOptions } from "./hooks/useBookmarkOptions";
import { useDeviationOptions } from "./hooks/useDeviationOptions";
import { useGroupOptions } from "./hooks/useGroupOptions";
import { useObjectOptions } from "./hooks/useObjectOptions";
import { useSettingOptions } from "./hooks/useSettingOptions";
import { useWidgetOptions } from "./hooks/useWidgetOptions";
import { Category, SearchOption } from "./types";

const allCategories = [
    Category.Widget,
    Category.Group,
    Category.Bookmark,
    Category.Object,
    Category.Deviation,
    Category.Setting,
];
const categoryItemOrder = [
    Category.Widget,
    Category.Setting,
    Category.Deviation,
    Category.Bookmark,
    Category.Group,
    Category.Object,
];

export function GlobalSearch() {
    const { t } = useTranslation();
    const [show, setShow] = useState(false);
    const [term, setTerm] = useState("");
    const [categories, setCategories] = useState(allCategories);
    const inputRef = useRef<HTMLDivElement | null>(null);

    const widgetOptions = useWidgetOptions();
    const groupOptions = useGroupOptions();
    const bookmarkOptions = useBookmarkOptions(!show || !term);
    const deviationOptions = useDeviationOptions();
    const settingOptions = useSettingOptions();
    const [objectOptions, loadingObjectOptions] = useObjectOptions(
        categories.includes(Category.Object) && show ? term : "",
    );
    const openWidget = useOpenWidget();
    const selectBookmark = useSelectBookmark();
    const dispatch = useAppDispatch();
    const flyTo = useFlyTo();
    const shareLink = useShareLink();

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
            ...(categories.includes(Category.Deviation) ? deviationOptions : []),
            ...(categories.includes(Category.Setting) ? settingOptions : []),
        ];

        return allOptions.sort((a, b) => {
            const o1 = categoryItemOrder.indexOf(a.category);
            const o2 = categoryItemOrder.indexOf(b.category);
            if (o1 !== o2) {
                return o1 - o2;
            }
            return compareStrings(a.label, b.label);
        }) as SearchOption[];
    }, [widgetOptions, groupOptions, bookmarkOptions, objectOptions, deviationOptions, settingOptions, categories]);

    const onSelect = useCallback(
        async (newValue: string | SearchOption | null) => {
            if (!newValue || typeof newValue === "string") {
                return;
            }

            switch (newValue.category) {
                case Category.Widget: {
                    if (newValue.widget.key === "shareLink") {
                        if (await shareLink()) {
                            dispatch(explorerActions.setSnackbarMessage({ msg: t("copiedToClipboard") }));
                        }
                    } else {
                        openWidget(newValue.widget.key);
                    }
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
                case Category.Deviation: {
                    dispatch(renderActions.setViewMode(ViewMode.Deviations));
                    dispatch(deviationsActions.setSelectedProfileId(newValue.profile.id));
                    break;
                }
                case Category.Setting: {
                    openWidget(featuresConfig.advancedSettings.key);
                    dispatch(
                        explorerActions.setHighlightSetting({
                            route: newValue.route,
                            accordion: newValue.accordion,
                            field: newValue.field,
                        }),
                    );
                    break;
                }
            }

            hide();
        },
        [openWidget, selectBookmark, dispatch, flyTo, hide, shareLink, t],
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
                                    <SearchOptionItem option={option} term={cleanTerm} />
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

function SearchOptionItem({ option, term }: { option: SearchOption; term: string }) {
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
