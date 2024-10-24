import { AddCircle, ColorLens, DeleteSweep, RemoveCircle } from "@mui/icons-material";
import { Box, Button, FormControlLabel, Link as MuiLink, Radio, RadioGroup, Typography, useTheme } from "@mui/material";
import { MouseEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, IosSwitch, ScrollBox } from "components";
import { highlightActions, useDispatchHighlighted, useHighlighted } from "contexts/highlighted";
import { GroupStatus, objectGroupsActions, useDispatchObjectGroups, useObjectGroups } from "contexts/objectGroups";
import { selectionBasketActions, useDispatchSelectionBasket, useSelectionBasket } from "contexts/selectionBasket";
import { ColorPicker } from "features/colorPicker";
import { propertyTreeActions, selectPropertyTreeBookmarkState } from "features/propertyTree/slice";
import {
    ObjectVisibility,
    renderActions,
    selectDefaultVisibility,
    SelectionBasketMode,
    selectSelectionBasketColor,
    selectSelectionBasketMode,
} from "features/render";
import { rgbToVec, vecToRgb } from "utils/color";

export function Root() {
    const { t } = useTranslation();
    const theme = useTheme();
    const defaultVisibility = useAppSelector(selectDefaultVisibility);
    const mode = useAppSelector(selectSelectionBasketMode);
    const propertyTreeGroups = useAppSelector(selectPropertyTreeBookmarkState)?.groups ?? [];

    const { idArr: highlighted } = useHighlighted();
    const { idArr: visible } = useSelectionBasket();
    const objectGroups = useObjectGroups();
    const dispatchObjectGroups = useDispatchObjectGroups();

    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchSelectionBasket = useDispatchSelectionBasket();
    const dispatch = useAppDispatch();

    const color = useAppSelector(selectSelectionBasketColor);
    const { r, g, b } = vecToRgb(color.color);

    const [colorPickerAnchor, setColorPickerAnchor] = useState<null | HTMLElement>(null);
    const toggleColorPicker = (event?: MouseEvent<HTMLElement>) => {
        setColorPickerAnchor(!colorPickerAnchor && event?.currentTarget ? event.currentTarget : null);
    };

    const selectedGroups = [...objectGroups, ...propertyTreeGroups].filter(
        (group) => group.status === GroupStatus.Selected,
    );
    const hasHighlighted = highlighted.length || selectedGroups.length;

    useEffect(() => {
        if (mode === SelectionBasketMode.Strict && !visible.length) {
            dispatch(renderActions.setSelectionBasketMode(SelectionBasketMode.Loose));
        }
    }, [visible, mode, dispatch]);

    const handleAdd = () => {
        const fromGroup = selectedGroups.flatMap((grp) => [...grp.ids]);

        dispatchSelectionBasket(selectionBasketActions.add(highlighted.concat(fromGroup)));
        dispatchHighlighted(highlightActions.setIds([]));
        dispatchObjectGroups(
            objectGroupsActions.set(
                objectGroups.map((group) => ({
                    ...group,
                    status: group.status === GroupStatus.Selected ? GroupStatus.None : group.status,
                })),
            ),
        );
        dispatch(propertyTreeActions.resetAllGroupsStatus());
    };

    const handleRemove = () => {
        const fromGroup = selectedGroups.flatMap((grp) => [...grp.ids]);

        dispatchSelectionBasket(selectionBasketActions.remove(highlighted.concat(fromGroup)));
        dispatchHighlighted(highlightActions.setIds([]));
        dispatchObjectGroups(
            objectGroupsActions.set(
                objectGroups.map((group) => ({
                    ...group,
                    status: group.status === GroupStatus.Selected ? GroupStatus.None : group.status,
                })),
            ),
        );
        dispatch(propertyTreeActions.resetAllGroupsStatus());
    };

    const handleClear = () => {
        dispatchSelectionBasket(selectionBasketActions.set([]));
    };

    const handleViewTypeChange = (_: unknown, value: string) => {
        dispatch(renderActions.setDefaultVisibility(value as ObjectVisibility));
    };

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display={"flex"} justifyContent="space-between">
                    <Button
                        color="grey"
                        disabled={!hasHighlighted || mode === SelectionBasketMode.Strict}
                        onClick={handleAdd}
                    >
                        <AddCircle sx={{ mr: 1 }} />
                        {t("add")}
                    </Button>
                    <Button color="grey" disabled={!hasHighlighted || !visible.length} onClick={handleRemove}>
                        <RemoveCircle sx={{ mr: 1 }} />
                        {t("remove")}
                    </Button>
                    <Button color="grey" disabled={!visible.length} onClick={handleClear}>
                        <DeleteSweep sx={{ mr: 1 }} />
                        {t("clear")}
                    </Button>
                </Box>
            </Box>

            <ScrollBox display="flex" flexDirection="column" p={1} pb={2} mt={1}>
                <Box sx={{ mb: 2 }}>
                    <MuiLink component={Link} to="/list">
                        {t("objectsInBasketName")}
                        {visible.length}
                    </MuiLink>
                </Box>
                <FormControlLabel
                    control={
                        <IosSwitch
                            name="toggle highlight only from basket"
                            size="medium"
                            color="primary"
                            disabled={!visible.length}
                            checked={mode === SelectionBasketMode.Strict}
                            onChange={() =>
                                dispatch(
                                    renderActions.setSelectionBasketMode(
                                        mode === SelectionBasketMode.Strict
                                            ? SelectionBasketMode.Loose
                                            : SelectionBasketMode.Strict,
                                    ),
                                )
                            }
                        />
                    }
                    label={<Box fontSize={14}>{t("highlightOnlyFromBasket")}</Box>}
                />
                <Divider sx={{ mb: 2 }} />
                <Typography fontWeight={600}>{t("viewMode")}</Typography>
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
                <Divider sx={{ my: 2 }} />
                <Typography fontWeight={600}>{t("basketColor")}</Typography>
                <FormControlLabel
                    control={
                        <IosSwitch
                            name="toggle use natural colors"
                            size="medium"
                            color="primary"
                            checked={!color.use}
                            onChange={() => dispatch(renderActions.setSelectionBasketColor({ use: !color.use }))}
                        />
                    }
                    label={<Box fontSize={14}>{t("useNaturalColors")}</Box>}
                />

                {color.use ? (
                    <Box sx={{ mt: 1 }}>
                        <Button
                            variant="outlined"
                            color="grey"
                            disabled={!color.use}
                            startIcon={
                                <ColorLens
                                    sx={{ color: color.use ? `rgb(${r}, ${g}, ${b})` : undefined }}
                                    fontSize="small"
                                />
                            }
                            onClick={toggleColorPicker}
                        >
                            {t("setBasketColor")}
                        </Button>
                    </Box>
                ) : null}
                <ColorPicker
                    id={colorPickerAnchor ? "selection-basket-color-picker" : undefined}
                    open={Boolean(colorPickerAnchor)}
                    anchorEl={colorPickerAnchor}
                    onClose={() => toggleColorPicker()}
                    color={color.color}
                    onChangeComplete={({ rgb }) =>
                        dispatch(renderActions.setSelectionBasketColor({ color: rgbToVec(rgb) }))
                    }
                />
            </ScrollBox>
        </>
    );
}
