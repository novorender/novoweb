import { Circle } from "@mui/icons-material";
import { ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import { useHistory } from "react-router-dom";

import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { FormId, FormObject, FormRecord, type FormState } from "features/forms/types";
import { VecRGBA } from "utils/color";

const HIGHLIGHT_COLOR = [1, 0.4, 0.7, 1] as VecRGBA;

export function FormsListItem({
    item,
    formId,
}: {
    item: (FormObject & { formState: FormState }) | (FormRecord & { id: number; formState: FormState });
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
        if (searchForm) {
            dispatchHighlighted(highlightActions.set({ color: HIGHLIGHT_COLOR, ids: [item.id] }));
        }
    };

    const handleMouseLeave = () => {
        if (searchForm) {
            dispatchHighlighted(highlightActions.remove([item.id]));
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
                    htmlColor={item.formState === "new" ? "red" : item.formState === "finished" ? "green" : "orange"}
                    fontSize="inherit"
                />
            </ListItemIcon>
            <ListItemText>{"name" in item ? item.name : "title" in item && item.title}</ListItemText>
        </ListItemButton>
    );
}
