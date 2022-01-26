import { AddCircle, DeleteSweep, RemoveCircle } from "@mui/icons-material";
import { Box, Button, Typography, RadioGroup, FormControlLabel, Radio } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/store";
import { Divider, IosSwitch, LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { useToggle } from "hooks/useToggle";
import { WidgetList } from "features/widgetList";

import { customGroupsActions, useCustomGroups } from "contexts/customGroups";
import { highlightActions, useDispatchHighlighted, useHighlighted } from "contexts/highlighted";
import { useDispatchVisible, useVisible, visibleActions } from "contexts/visible";
import {
    ObjectVisibility,
    renderActions,
    selectDefaultVisibility,
    SelectionBasketMode,
    selectSelectionBasketMode,
} from "slices/renderSlice";
import { useEffect } from "react";

export function SelectionBasket() {
    const [menuOpen, toggleMenu] = useToggle();
    const defaultVisibility = useAppSelector(selectDefaultVisibility);
    const mode = useAppSelector(selectSelectionBasketMode);
    const { idArr: highlighted } = useHighlighted();
    const { idArr: visible } = useVisible();
    const { state: customGroups, dispatch: dispatchCustomGroups } = useCustomGroups();

    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchVisible = useDispatchVisible();
    const dispatch = useAppDispatch();

    const selectedGroups = customGroups.filter((group) => group.selected);
    const hasHighlighted = highlighted.length || selectedGroups.length;

    useEffect(() => {
        if (mode === SelectionBasketMode.Strict && !visible.length) {
            dispatch(renderActions.setSelectionBasketMode(SelectionBasketMode.Loose));
        }
    }, [visible, mode, dispatch]);

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
                <WidgetHeader widget={{ ...featuresConfig.selectionBasket, name: "Selection basket" as any }}>
                    {!menuOpen ? (
                        <Box display="flex" justifyContent="space-between">
                            <Button
                                color="grey"
                                disabled={!hasHighlighted || mode === SelectionBasketMode.Strict}
                                onClick={handleAdd}
                            >
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
                    <Typography sx={{ mb: 2 }}>Objects in basket: {visible.length}</Typography>
                    <FormControlLabel
                        control={
                            <IosSwitch
                                size="medium"
                                color="primary"
                                disabled={!visible.length}
                                checked={mode === SelectionBasketMode.Strict}
                                onChange={() =>
                                    dispatch(
                                        renderActions.setSelectionBasketMode(
                                            mode === SelectionBasketMode.Strict
                                                ? SelectionBasketMode.Loose
                                                : SelectionBasketMode.Strict
                                        )
                                    )
                                }
                            />
                        }
                        label={<Box fontSize={14}>Highlight only from basket</Box>}
                    />
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
                            label="Basket - Semi-transparent"
                        />
                        <FormControlLabel
                            value={ObjectVisibility.Transparent}
                            control={<Radio />}
                            label="Basket - Transparent"
                        />
                    </RadioGroup>
                </Box>
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.selectionBasket.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.selectionBasket.key}-widget-menu-fab`}
            />
        </>
    );
}

// add alltid highlighta
// hvis strict -> kan basically ikje adda
