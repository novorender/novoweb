import { Circle } from "@mui/icons-material";
import { ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import { ObjectId } from "@novorender/api/types/data";
import { useHistory } from "react-router-dom";

import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { VecRGBA } from "utils/color";

import { FormId, FormObject, type FormState } from "../../types";

const HIGHLIGHT_COLOR = [1, 0.4, 0.7, 1] as VecRGBA;

export function FormsListItem({
    item,
    formId,
}: {
    item: FormObject & { id: ObjectId; formState: FormState };
    formId: FormId;
}) {
    const history = useHistory();
    const dispatchHighlighted = useDispatchHighlighted();

    if (!item) {
        return null;
    }

    const handleClick = () => {
        history.push(`/instance/${item.guid}-${formId}`);
    };

    const handleMouseEnter = () => {
        dispatchHighlighted(highlightActions.set({ color: HIGHLIGHT_COLOR, ids: [item.id] }));
    };

    const handleMouseLeave = () => {
        dispatchHighlighted(highlightActions.remove([item.id]));
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
            <ListItemText>{item.name}</ListItemText>
        </ListItemButton>
    );
}
