import type { SpeedDialActionProps } from "@mui/material";
import { MouseEvent, useState } from "react";
import type { ColorResult } from "react-color";
import { useTranslation } from "react-i18next";

import { SpeedDialAction } from "components";
import { featuresConfig } from "config/features";
import { highlightActions, useDispatchHighlighted, useHighlighted } from "contexts/highlighted";
import { ColorPicker } from "features/colorPicker";
import { rgbToVec } from "utils/color";

type Props = SpeedDialActionProps;

export function SelectionColor(props: Props) {
    const { t } = useTranslation();
    const { nameKey, Icon } = featuresConfig["selectionColor"];

    const { color } = useHighlighted();
    const dispatch = useDispatchHighlighted();

    const [colorPickerAnchor, setColorPickerAnchor] = useState<null | HTMLElement>(null);

    const toggleColorPicker = (event?: MouseEvent<HTMLElement>) => {
        setColorPickerAnchor(!colorPickerAnchor && event?.currentTarget ? event.currentTarget : null);
    };

    const handleChangeComplete = ({ rgb }: ColorResult) =>
        dispatch(highlightActions.setColor(rgbToVec({ ...rgb, a: rgb.a ?? 1 })));

    const open = Boolean(colorPickerAnchor);

    return (
        <>
            <SpeedDialAction
                {...props}
                data-test="selection-color"
                active={open}
                onClick={toggleColorPicker}
                title={t(nameKey)}
                icon={<Icon />}
            />
            <ColorPicker
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
                open={open}
                anchorEl={colorPickerAnchor}
                onClose={() => toggleColorPicker()}
                color={color}
                onChangeComplete={handleChangeComplete}
            />
        </>
    );
}
