import { AddCircle, ArrowBack, ArrowDownward, ArrowUpward, Delete, MoreVert, Save } from "@mui/icons-material";
import {
    Box,
    Button,
    IconButton,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Popover,
    Typography,
} from "@mui/material";
import { useTheme } from "@mui/material";
import { t } from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { Omega365Configuration, Omega365View, RequestedType } from "apis/dataV2/omega365Types";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, ScrollBox, TextField } from "components";

import { selectOmega365Config, selectOmega365ConfigDraft } from "../selectors";
import { omega365Actions } from "../slice";

const MAX_VIEW_COUNT = 5;

export default function ConfigEditor() {
    const { t } = useTranslation();
    const config = useAppSelector(selectOmega365Config)!;
    const configDraft = useAppSelector(selectOmega365ConfigDraft)!;
    const views = configDraft.views;
    const theme = useTheme();
    const history = useHistory();
    const dispatch = useAppDispatch();

    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const [showBackPopover, setShowBackPopover] = useState(false);

    const updateConfigDraft = (update: Partial<Omega365Configuration>) => {
        dispatch(omega365Actions.setConfigDraft({ ...configDraft, ...update }));
    };

    const handleBack = (e: React.MouseEvent<HTMLButtonElement>, force = false) => {
        const changed = config !== configDraft;
        if (changed && !force) {
            setAnchorEl(e.currentTarget);
            setShowBackPopover(true);
        } else {
            dispatch(omega365Actions.setConfigDraft(null));
            history.push("/");
        }
    };

    return (
        <>
            {/* Header */}
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex">
                    <Button color="grey" onClick={handleBack}>
                        <ArrowBack sx={{ mr: 1 }} />
                        {t("back")}
                    </Button>
                    <Box flex="auto" />
                    <Button color="grey" onClick={() => history.push("/save?closeAfter=true")}>
                        <Save sx={{ mr: 1 }} />
                        {t("save")}
                    </Button>
                </Box>
            </Box>

            <Popover
                open={showBackPopover}
                anchorEl={anchorEl}
                onClose={() => setShowBackPopover(false)}
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "left",
                }}
            >
                <Typography sx={{ p: 2 }}>{t("configurationWasUpdatedDoYouWantToSaveTheChanges")}</Typography>
                <Box m={1} display="flex" justifyContent="flex-end">
                    <Button onClick={() => history.push("/save?closeAfter=true")}>{t("yes")}</Button>
                    <Button color="grey" onClick={(e) => handleBack(e, true)}>
                        {t("no")}
                    </Button>
                    <Button color="grey" onClick={() => setShowBackPopover(false)}>
                        {t("cancel")}
                    </Button>
                </Box>
            </Popover>

            {/* Content */}
            <ScrollBox flexDirection="column" height={1} pt={1} pb={3}>
                <Box mt={2} px={2}>
                    <TextField
                        value={configDraft.baseURL}
                        onChange={(e) => updateConfigDraft({ baseURL: e.target.value })}
                        label={t("baseURL")}
                        placeholder="https://my-company.omega365.com"
                        fullWidth
                        required
                    />
                </Box>
                <Box gap={1} display="flex" alignItems="center" m={2} mb={0}>
                    <Typography fontWeight="600">{t("views")}</Typography>

                    <Button
                        disabled={views && views.length >= MAX_VIEW_COUNT}
                        color="grey"
                        onClick={() => {
                            history.push("/newView");
                        }}
                    >
                        <AddCircle sx={{ mr: 1 }} />
                        {t("add")}
                    </Button>
                </Box>
                <ViewListInner
                    views={views}
                    onClick={(view) => {
                        history.push(`/editView/${view.id}`);
                    }}
                    onChange={(views) => updateConfigDraft({ views })}
                />
            </ScrollBox>
        </>
    );
}

function ViewListInner({
    views,
    onClick,
    onChange,
}: {
    views: Omega365View[] | undefined;
    onClick: (view: Omega365View) => void;
    onChange: (views: Omega365View[]) => void;
}) {
    const { t } = useTranslation();
    if (!views || views.length === 0) {
        return (
            <Box color="grey" m={4} textAlign="center">
                {t("noViewsYet")}
            </Box>
        );
    }

    return (
        <List
            dense
            sx={{
                width: "100%",
                bgcolor: "background.paper",
                position: "relative",
                overflow: "auto",
                mb: 1,
            }}
        >
            {views.map((view, index) => {
                return (
                    <ViewListItem
                        key={view.id}
                        views={views}
                        index={index}
                        onClick={() => onClick(view)}
                        onChange={onChange}
                    />
                );
            })}
        </List>
    );
}

function ViewListItem({
    views,
    index,
    onClick,
    onChange,
}: {
    views: Omega365View[];
    index: number;
    onClick: () => void;
    onChange: (views: Omega365View[]) => void;
}) {
    const history = useHistory();
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    const view = views[index];

    const handleMoveUp = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(
            views.map((view, i) => {
                if (i === index) {
                    return views[index - 1];
                } else if (i === index - 1) {
                    return views[index];
                } else {
                    return view;
                }
            }),
        );
        closeMenu();
    };

    const handleMoveDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(
            views.map((view, i) => {
                if (i === index) {
                    return views[index + 1];
                } else if (i === index + 1) {
                    return views[index];
                } else {
                    return view;
                }
            }),
        );
        closeMenu();
    };

    return (
        <ListItemButton key={view.id} onClick={onClick}>
            <ListItemText
                primary={view.title}
                secondary={`${view.requestedType === RequestedType.Resource ? "resourceName" : "viewName"}: ${
                    view.viewOrResourceName
                }`}
            />
            <Box flex="0 0 auto">
                <IconButton
                    color={menuAnchor ? "primary" : "default"}
                    size="small"
                    aria-haspopup="true"
                    onClick={(e) => {
                        e.stopPropagation();
                        setMenuAnchor(e.currentTarget.parentElement);
                    }}
                >
                    <MoreVert />
                </IconButton>
            </Box>
            <Menu
                onClick={(e) => e.stopPropagation()}
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={closeMenu}
                MenuListProps={{ sx: { maxWidth: "100%", minWidth: 100 } }}
            >
                <MenuItem onClick={handleMoveUp} disabled={index === 0}>
                    <ListItemIcon>
                        <ArrowUpward fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t("moveUp")}</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleMoveDown} disabled={index === views.length - 1}>
                    <ListItemIcon>
                        <ArrowDownward fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t("moveDown")}</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => history.push(`/delete/${view.id}`)}>
                    <ListItemIcon>
                        <Delete fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t("delete")}</ListItemText>
                </MenuItem>
            </Menu>
        </ListItemButton>
    );
}
