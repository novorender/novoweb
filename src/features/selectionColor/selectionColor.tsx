import { MouseEvent, useState } from "react";
import type { ColorResult } from "react-color";
import type { SpeedDialActionProps } from "@mui/material";

import { SpeedDialAction } from "components";
import { featuresConfig } from "config/features";
import { rgbToVec } from "utils/color";
import { ColorPicker } from "features/colorPicker";
import { highlightActions, useDispatchHighlighted, useHighlighted } from "contexts/highlighted";

type Props = SpeedDialActionProps;

export function SelectionColor(props: Props) {
    const { name, Icon } = featuresConfig["selectionColor"];

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
                title={name}
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
