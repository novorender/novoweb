import { AddCircle, DeleteSweep, RemoveCircle } from "@mui/icons-material";
import { Box, Button, useTheme } from "@mui/material";
import { highlightActions, useDispatchHighlighted, useHighlighted } from "contexts/highlighted";
import { useDispatchVisible, useVisible, visibleActions } from "contexts/visible";

export function Layers() {
    const theme = useTheme();
    const { idArr: highlighted } = useHighlighted();
    const { idArr: visible } = useVisible();

    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchVisible = useDispatchVisible();

    const handleAdd = () => {
        dispatchVisible(visibleActions.add(highlighted));
        dispatchHighlighted(highlightActions.setIds([]));
    };

    const handleRemove = () => {
        dispatchVisible(visibleActions.remove(highlighted));
        dispatchHighlighted(highlightActions.setIds([]));
    };

    const handleClear = () => {
        dispatchVisible(visibleActions.set([]));
    };

    return (
        <Box p={1} boxShadow={theme.customShadows.widgetHeader} display="flex" justifyContent="space-between">
            <Button color="grey" disabled={!highlighted.length} onClick={handleAdd}>
                <AddCircle sx={{ mr: 1 }} />
                Add
            </Button>
            <Button color="grey" disabled={!highlighted.length || !visible.length} onClick={handleRemove}>
                <RemoveCircle sx={{ mr: 1 }} />
                Remove
            </Button>
            <Button color="grey" disabled={!visible.length} onClick={handleClear}>
                <DeleteSweep sx={{ mr: 1 }} />
                Clear
            </Button>
        </Box>
    );
}
