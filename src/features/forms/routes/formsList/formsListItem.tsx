import { Circle } from "@mui/icons-material";
import { ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import { useHistory } from "react-router-dom";

import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { type FormId, type FormRecord } from "features/forms/types";

import { HIGHLIGHT_COLOR } from "../instance/constants";

export function FormsListItem({
    item,
    formId,
}: {
    item: FormRecord & { id?: number; guid?: string; name?: string };
    formId: FormId;
}) {
    const history = useHistory();
    const dispatchHighlighted = useDispatchHighlighted();

    if (!item) {
        return null;
    }

    const searchForm = "guid" in item;

    const handleClick = () => {
        const id = searchForm ? item.guid : item.id;
        if (searchForm) {
            history.push({
                pathname: "/search-instance",
                search: `?objectGuid=${id}&formId=${formId}`,
            });
        } else {
            history.push({
                pathname: "/location-instance",
                search: `?templateId=${formId}&formId=${id}`,
            });
        }
    };

    const handleMouseEnter = () => {
        if (searchForm && Number.isInteger(item.id)) {
            dispatchHighlighted(highlightActions.set({ color: HIGHLIGHT_COLOR, ids: [item.id!] }));
        }
    };

    const handleMouseLeave = () => {
        if (searchForm && Number.isInteger(item.id)) {
            dispatchHighlighted(highlightActions.remove([item.id!]));
        }
    };

    return (
        <ListItemButton
            sx={{ px: 1 }}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <ListItemIcon
                sx={{
                    minWidth: 24,
                    minHeight: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    mr: 1,
                }}
            >
                <Circle
                    htmlColor={item.state === "new" ? "red" : item.state === "finished" ? "green" : "orange"}
                    fontSize="inherit"
                />
            </ListItemIcon>
            <ListItemText>{item.title ?? item.name ?? item.guid}</ListItemText>
        </ListItemButton>
    );
}
