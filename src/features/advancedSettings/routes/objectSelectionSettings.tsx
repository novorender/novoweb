import { ArrowBack, ColorLens, Save } from "@mui/icons-material";
import { Box, Button, Typography, useTheme } from "@mui/material";
import { MouseEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, LinearProgress, TextField, WidgetBottomScrollBox } from "components";
import {
    HighlightCollection,
    highlightCollectionsActions,
    useDispatchHighlightCollections,
    useHighlightCollections,
} from "contexts/highlightCollections";
import { highlightActions, useDispatchHighlighted, useHighlighted } from "contexts/highlighted";
import { ColorPicker } from "features/colorPicker";
import { renderActions, selectSecondaryHighlightProperty } from "features/render";
import { rgbToVec, VecRGBA, vecToRgb } from "utils/color";

export function ObjectSelectionSettings({ save, saving }: { save: () => Promise<void>; saving: boolean }) {
    const { t } = useTranslation();
    const history = useHistory();
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHighlightCollections = useDispatchHighlightCollections();

    const primaryColor = useHighlighted().color;
    const secondaryColor = useHighlightCollections().secondaryHighlight.color;
    const secondaryHighlight = useAppSelector(selectSecondaryHighlightProperty);

    const [secondaryHighlightInputValue, setSecondaryHighlightInputValue] = useState(secondaryHighlight ?? "");
    const [colorPicker, setColorPicker] = useState<{ anchor: HTMLElement; id: "primary" | "secondary" } | null>(null);

    const toggleColorPicker = (id: "primary" | "secondary") => (event?: MouseEvent<HTMLElement>) => {
        setColorPicker((state) => {
            if (!event?.currentTarget || id === state?.id) {
                return null;
            }

            return {
                id,
                anchor: event.currentTarget,
            };
        });
    };

    const primaryRgb = vecToRgb(primaryColor);
    const secondaryRgb = vecToRgb(secondaryColor);

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex" justifyContent="space-between">
                    <Button onClick={() => history.goBack()} color="grey">
                        <ArrowBack sx={{ mr: 1 }} />
                        {t("back")}
                    </Button>
                    <Button sx={{ ml: "auto" }} onClick={() => save()} color="grey" disabled={saving}>
                        <Save sx={{ mr: 1 }} />
                        {t("save")}
                    </Button>
                </Box>
            </Box>
            {saving ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : null}
            <WidgetBottomScrollBox height={1} px={1} mt={1} pb={3}>
                <Typography pt={1} variant="h6" fontWeight={600}>
                    {t("objectSelectionSettings")}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography fontWeight={600} mb={1}>
                    {t("primary")}
                </Typography>
                <Button
                    id="object-selection-primary-highlight-color"
                    variant="outlined"
                    color="grey"
                    onClick={toggleColorPicker("primary")}
                >
                    <ColorLens
                        sx={{
                            mr: 1,
                            color: `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, ${Math.max(
                                primaryRgb.a ?? 1,
                                0.25,
                            )})`,
                        }}
                        fontSize="small"
                    />
                    {t("primaryHighlightColor")}
                </Button>
                <Divider sx={{ my: 1 }} />
                <Typography fontWeight={600} mb={1}>
                    {t("secondary")}
                </Typography>

                <TextField
                    sx={{ mb: 2 }}
                    fullWidth
                    size="small"
                    label="Property"
                    value={secondaryHighlightInputValue}
                    onChange={({ target: { value } }) => setSecondaryHighlightInputValue(value)}
                    onBlur={() =>
                        dispatch(
                            renderActions.setSecondaryHighlight({
                                property: secondaryHighlightInputValue,
                            }),
                        )
                    }
                />

                <Button
                    id="object-selection-secondary-highlight-color"
                    sx={{ mb: 2 }}
                    variant="outlined"
                    color="grey"
                    onClick={toggleColorPicker("secondary")}
                >
                    <ColorLens
                        sx={{
                            mr: 1,
                            color: `rgba(${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}, ${Math.max(
                                secondaryRgb.a ?? 1,
                                0.25,
                            )})`,
                        }}
                        fontSize="small"
                    />
                    {t("secondaryHighlightColor")}
                </Button>

                <ColorPicker
                    key={colorPicker?.id}
                    open={Boolean(colorPicker?.anchor)}
                    anchorEl={colorPicker?.anchor}
                    onClose={() => setColorPicker(null)}
                    color={colorPicker?.id === "primary" ? primaryColor : secondaryColor}
                    onChangeComplete={({ rgb }) => {
                        if (!colorPicker) {
                            return;
                        }

                        const rgba = rgbToVec(rgb) as VecRGBA;

                        if (colorPicker.id === "primary") {
                            dispatchHighlighted(highlightActions.setColor(rgba));
                        } else {
                            dispatchHighlightCollections(
                                highlightCollectionsActions.setColor(HighlightCollection.SecondaryHighlight, rgba),
                            );
                        }
                    }}
                />
            </WidgetBottomScrollBox>
        </>
    );
}
