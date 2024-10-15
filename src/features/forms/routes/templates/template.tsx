import { AddCircle, Delete, Edit, MoreVert, Place, Search } from "@mui/icons-material";
import { Box, IconButton, ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from "@mui/material";
import { MouseEvent, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { Permission } from "apis/dataV2/permissions";
import { type MinimalTemplate, TemplateType } from "features/forms/types";
import { ShareLink } from "features/shareLink";
import { useCheckProjectPermission } from "hooks/useCheckProjectPermissions";

import { DELETE_TEMPLATE_ROUTE } from "../constants";

export function Template({ template }: { template: MinimalTemplate }) {
    const { t } = useTranslation();
    const history = useHistory();
    const checkPermission = useCheckProjectPermission();
    const canView = checkPermission(Permission.FormsView);
    const canEdit = checkPermission(Permission.FormsManage);
    const canDelete = checkPermission(Permission.FormsDelete);

    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

    const templateIcon = useMemo(
        () =>
            template?.type === TemplateType.Search || template?.type === TemplateType.Object ? (
                <Search />
            ) : template?.type === TemplateType.Location || template?.type === TemplateType.Geo ? (
                <Place />
            ) : null,
        [template],
    );

    const count = useMemo(() => {
        if (!template) {
            return "";
        }
        const { finished, total } = template.forms;
        return total === 0 ? "" : `${finished} / ${total}`;
    }, [template]);

    const handleClick = useCallback(() => {
        if (!template) {
            return;
        }
        history.push(`/forms/${template.id}`);
    }, [history, template]);

    const openMenu = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget.parentElement);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    const handleEditClick = () => {
        history.push(`/edit/${template.id}`);
    };

    const handleCreateFromClick = () => {
        history.push(`/create-from/${template.id}`);
    };

    const handleDeleteClick = useCallback(() => {
        closeMenu();
        history.push({
            pathname: DELETE_TEMPLATE_ROUTE,
            state: {
                title: template.title,
                templateId: template.id,
                templateType: template.type,
            },
        });
    }, [history, template.title, template.id, template.type]);

    return (
        <ListItemButton
            key={template.id}
            sx={{ justifyContent: "space-between", height: "48px" }}
            onClick={handleClick}
        >
            {templateIcon}
            <Typography
                whiteSpace="nowrap"
                overflow="hidden"
                textOverflow="ellipsis"
                flex={1}
                mx={1}
                title={template.title}
            >
                {template.title}
            </Typography>
            <Typography>{count}</Typography>
            {canEdit || canDelete ? (
                <Box>
                    <Menu
                        onClick={(e) => e.stopPropagation()}
                        anchorEl={menuAnchor}
                        open={Boolean(menuAnchor)}
                        onClose={closeMenu}
                        id={`${template.id}-menu`}
                    >
                        {canView && (
                            <ShareLink
                                variant="menuItem"
                                nameKey="share"
                                explorerStateOverwrite={{ forms: { currentFormsList: template.id } }}
                                onClick={closeMenu}
                            />
                        )}
                        {canEdit && (
                            <MenuItem onClick={handleEditClick} disabled={!canEdit}>
                                <ListItemIcon>
                                    <Edit fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>{t("edit")}</ListItemText>
                            </MenuItem>
                        )}
                        {canEdit && (
                            <MenuItem onClick={handleCreateFromClick} disabled={!canEdit}>
                                <ListItemIcon>
                                    <AddCircle fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>{t("createFrom")}</ListItemText>
                            </MenuItem>
                        )}
                        {canDelete && (
                            <MenuItem onClick={handleDeleteClick} disabled={!canDelete}>
                                <ListItemIcon>
                                    <Delete fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>{t("delete")}</ListItemText>
                            </MenuItem>
                        )}
                    </Menu>
                    <IconButton
                        size="small"
                        onClick={openMenu}
                        aria-controls={`${template.id}-menu`}
                        color={menuAnchor ? "primary" : "default"}
                        aria-haspopup="true"
                    >
                        <MoreVert />
                    </IconButton>
                </Box>
            ) : null}
        </ListItemButton>
    );
}
