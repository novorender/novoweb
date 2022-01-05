import { AddCircle, DeleteSweep, RemoveCircle } from "@mui/icons-material";
import { Box, Button, Typography, RadioGroup, FormControlLabel, Radio } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/store";
import { Divider, LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { useToggle } from "hooks/useToggle";
import { WidgetList } from "features/widgetList";

import { customGroupsActions, useCustomGroups } from "contexts/customGroups";
import { highlightActions, useDispatchHighlighted, useHighlighted } from "contexts/highlighted";
import { useDispatchVisible, useVisible, visibleActions } from "contexts/visible";
import { ObjectVisibility, renderActions, selectDefaultVisibility } from "slices/renderSlice";

export function Layers() {
    const [menuOpen, toggleMenu] = useToggle();
    const defaultVisibility = useAppSelector(selectDefaultVisibility);
    const { idArr: highlighted } = useHighlighted();
    const { idArr: visible } = useVisible();
    const { state: customGroups, dispatch: dispatchCustomGroups } = useCustomGroups();

    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchVisible = useDispatchVisible();
    const dispatch = useAppDispatch();

    const selectedGroups = customGroups.filter((group) => group.selected);
    const hasHighlighted = highlighted.length || selectedGroups.length;

    const handleAdd = () => {
        const fromGroup = selectedGroups.map((grp) => grp.ids).flat();

        dispatchVisible(visibleActions.add(highlighted.concat(fromGroup)));
        dispatchHighlighted(highlightActions.setIds([]));
        dispatchCustomGroups(customGroupsActions.set(customGroups.map((group) => ({ ...group, selected: false }))));
    };

    const handleRemove = () => {
        const fromGroup = selectedGroups.map((grp) => grp.ids).flat();

        dispatchVisible(visibleActions.remove(highlighted.concat(fromGroup)));
        dispatchHighlighted(highlightActions.setIds([]));
        dispatchCustomGroups(customGroupsActions.set(customGroups.map((group) => ({ ...group, selected: false }))));
    };

    const handleClear = () => {
        dispatchVisible(visibleActions.set([]));
    };

    const handleViewTypeChange = (_: any, value: string) => {
        const val = Number(value) as ObjectVisibility;
        dispatch(renderActions.setDefaultVisibility(val));
    };

    return (
        <>
            <WidgetContainer>
                <WidgetHeader widget={featuresConfig.layers}>
                    {!menuOpen ? (
                        <Box display="flex" justifyContent="space-between">
                            <Button color="grey" disabled={!hasHighlighted} onClick={handleAdd}>
                                <AddCircle sx={{ mr: 1 }} />
                                Add
                            </Button>
                            <Button color="grey" disabled={!hasHighlighted || !visible.length} onClick={handleRemove}>
                                <RemoveCircle sx={{ mr: 1 }} />
                                Remove
                            </Button>
                            <Button color="grey" disabled={!visible.length} onClick={handleClear}>
                                <DeleteSweep sx={{ mr: 1 }} />
                                Clear
                            </Button>
                        </Box>
                    ) : null}
                </WidgetHeader>
                <Box display={menuOpen ? "none" : "flex"} flexDirection="column" p={1} mt={1}>
                    <Typography sx={{ mb: 2 }}>Objects in layer: {visible.length}</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Typography fontWeight={600}>View mode</Typography>
                    <RadioGroup
                        aria-label="View type"
                        value={defaultVisibility}
                        onChange={handleViewTypeChange}
                        name="radio-buttons-group"
                    >
                        <FormControlLabel value={ObjectVisibility.Neutral} control={<Radio />} label="All" />
                        <FormControlLabel
                            value={ObjectVisibility.SemiTransparent}
                            control={<Radio />}
                            label="Layer - Semi-transparent"
                        />
                        <FormControlLabel
                            value={ObjectVisibility.Transparent}
                            control={<Radio />}
                            label="Layer - Transparent"
                        />
                    </RadioGroup>
                </Box>
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.layers.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.layers.key}-widget-menu-fab`}
            />
        </>
    );
}
