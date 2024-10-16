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
    Typography,
    useTheme,
} from "@mui/material";
import { Fragment, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Permission } from "apis/dataV2/permissions";
import { useAppDispatch } from "app/redux-store-interactions";
import { LinearProgress, Tooltip } from "components";
import { featuresConfig } from "config/features";
import { GroupStatus, objectGroupsActions, useDispatchObjectGroups } from "contexts/objectGroups";
import { useSelectBookmark } from "features/bookmarks";
import { deviationsActions } from "features/deviations";
import { groupsActions } from "features/groups";
import { renderActions } from "features/render";
import { useShareLink } from "features/shareLink/useShareLink";
import { useCheckProjectPermission } from "hooks/useCheckProjectPermissions";
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

const CATEGORIES_LOCAL_STORAGE_KEY = "globalSearchCategories";

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

export default function GlobalSearchDropdown({ onSelect }: { onSelect?: () => void }) {
    const { t } = useTranslation();
    const [term, setTerm] = useState("");
    const checkPermission = useCheckProjectPermission();
    const availableCategories = useMemo(() => {
        const categories = [Category.Widget];
        if (checkPermission(Permission.GroupRead)) {
            categories.push(Category.Group);
        }
        if (checkPermission(Permission.BookmarkRead)) {
            categories.push(Category.Bookmark);
        }
        categories.push(Category.Object);
        if (checkPermission(Permission.DeviationRead)) {
            categories.push(Category.Deviation);
        }
        if (checkPermission(Permission.SceneManage)) {
            categories.push(Category.Setting);
        }
        return categories;
    }, [checkPermission]);
    const [categories, setCategories] = useState(() => {
        const s = localStorage.getItem(CATEGORIES_LOCAL_STORAGE_KEY);
        if (s) {
            try {
                return (JSON.parse(s) as Category[]).filter((cat) => allCategories.includes(cat));
            } catch (ex) {
                console.warn("Error parsing saved categories for global search", ex);
            }
        }
        return availableCategories;
    });

    // There can be more effective categories than available categories
    // if person set up preferred categories in a project where they have more permissions.
    // In this case remember these unallowed categories, but don't use them here.
    const effectiveCategories = useMemo(
        () => categories.filter((c) => availableCategories.includes(c)),
        [categories, availableCategories],
    );
    const inputRef = useRef<HTMLInputElement | null>(null);

    const widgetOptions = useWidgetOptions(!effectiveCategories.includes(Category.Widget));
    const groupOptions = useGroupOptions(!effectiveCategories.includes(Category.Group));
    const bookmarkOptions = useBookmarkOptions(!term || !effectiveCategories.includes(Category.Bookmark));
    const deviationOptions = useDeviationOptions(!effectiveCategories.includes(Category.Deviation));
    const settingOptions = useSettingOptions(!effectiveCategories.includes(Category.Setting));
    const [objectOptions, loadingObjectOptions] = useObjectOptions(
        effectiveCategories.includes(Category.Object) ? term : "",
    );
    const openWidget = useOpenWidget();
    const selectBookmark = useSelectBookmark();
    const dispatch = useAppDispatch();
    const flyTo = useFlyTo();
    const shareLink = useShareLink();

    const cleanTerm = term.trim().toLowerCase();

    const loading = loadingObjectOptions;

    const options = useMemo(() => {
        const allOptions = [
            ...widgetOptions,
            ...groupOptions,
            ...bookmarkOptions,
            ...objectOptions,
            ...deviationOptions,
            ...settingOptions,
        ];

        return allOptions.sort((a, b) => {
            const o1 = categoryItemOrder.indexOf(a.category);
            const o2 = categoryItemOrder.indexOf(b.category);
            if (o1 !== o2) {
                return o1 - o2;
            }
            return compareStrings(a.label, b.label);
        }) as SearchOption[];
    }, [widgetOptions, groupOptions, bookmarkOptions, objectOptions, deviationOptions, settingOptions]);

    const handleSelect = useCallback(
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
                    const data = await newValue.object.loadMetaData();
                    const sphere = data.bounds?.sphere;
                    if (sphere) {
                        flyTo({ sphere });
                    }
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

            onSelect?.();
        },
        [openWidget, selectBookmark, dispatch, flyTo, onSelect, shareLink, t],
    );

    const updateCategories = useCallback(
        (update: Category[]) => {
            const invisibleCategories = categories.filter((c) => !availableCategories.includes(c));
            const newCategories = [...update, ...invisibleCategories];
            setCategories(newCategories);
            localStorage.setItem(CATEGORIES_LOCAL_STORAGE_KEY, JSON.stringify(newCategories));
            inputRef.current?.focus();
        },
        [categories, availableCategories],
    );

    return (
        <Box sx={{ display: "flex", gap: 1 }}>
            <Box sx={{ position: "relative", flex: "auto" }}>
                <Autocomplete
                    options={options}
                    onChange={(_, newValue) => handleSelect(newValue)}
                    disablePortal
                    autoComplete
                    openOnFocus
                    onInputChange={(_, newInputValue) => {
                        setTerm(newInputValue);
                    }}
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
                            label={t("search")}
                            autoFocus
                            ref={inputRef}
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
                availableCategories={availableCategories}
                categories={effectiveCategories}
                onChange={updateCategories}
            />
        </Box>
    );
}

function CategorySelect({
    availableCategories,
    categories,
    onChange,
}: {
    availableCategories: Category[];
    categories: Category[];
    onChange: (categories: Category[]) => void;
}) {
    const { t } = useTranslation();
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
                {t("what")}
            </Button>
            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu} disablePortal>
                {availableCategories.map((category) => {
                    const checked = state.includes(category);

                    return (
                        <MenuItem
                            key={category}
                            onClick={() => {
                                if (checked) {
                                    setState(state.filter((c2) => c2 !== category));
                                } else {
                                    setState([...state, category]);
                                }
                            }}
                        >
                            {checked && (
                                <ListItemIcon>
                                    <Check />
                                </ListItemIcon>
                            )}
                            <ListItemText inset={!checked}>{getCategoryLabel(t, category)}</ListItemText>
                        </MenuItem>
                    );
                })}
            </Menu>
        </>
    );
}

function SearchOptionItem({ option, term }: { option: SearchOption; term: string }) {
    const { t } = useTranslation();
    const theme = useTheme();
    const dispatchObjectGroups = useDispatchObjectGroups();

    let addon: ReactNode | null = null;
    let sublabel: ReactNode | null = null;
    let title = "";

    switch (option.category) {
        case Category.Widget: {
            addon = (
                <Box color="grey">
                    <option.widget.Icon />
                </Box>
            );
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
                        {t("collection")} {group.grouping}
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

            break;
        }
    }

    return (
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", width: "100%" }}>
            <Chip label={getCategoryLabel(t, option.category)} sx={{ flex: "0 0 100px" }} />
            <Tooltip title={title} PopperProps={{ disablePortal: true }}>
                <Box flex="auto">
                    <Highlight
                        text={option.label}
                        term={("searchString" in option ? option.searchString : null) || term}
                    />
                    {sublabel}
                </Box>
            </Tooltip>
            {addon}
        </Box>
    );
}

function getCategoryLabel(t: ReturnType<typeof useTranslation>["t"], category: Category) {
    switch (category) {
        case Category.Deviation:
            return t("deviationLowercase");
        case Category.Object:
            return t("objectLowercase");
        default:
            return t(category);
    }
}

function Highlight({ text, term }: { text: string; term: string }) {
    const theme = useTheme();
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
                    <span key={i} style={{ color: theme.palette.primary.main }}>
                        {text}
                    </span>
                ) : (
                    <Fragment key={i}>{text}</Fragment>
                ),
            )}
        </>
    );
}
