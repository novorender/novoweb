import { Visibility } from "@mui/icons-material";
import { Box, Checkbox, ListItemButton, ListItemButtonProps, Typography, css, styled } from "@mui/material";
import { useState } from "react";

import { Tooltip } from "components";
import { ColorPicker } from "features/colorPicker";
import { VecRGB } from "utils/color";
import { hiddenActions, useDispatchHidden } from "contexts/hidden";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";

export const StyledListItemButton = styled(ListItemButton)<ListItemButtonProps>(
    ({ theme }) => css`
        margin: 0;
        flex-grow: 0;
        padding: ${theme.spacing(0.5)} ${theme.spacing(4)} ${theme.spacing(0.5)} ${theme.spacing(1)};
    `
);

export const StyledCheckbox = styled(Checkbox)`
    padding-top: 0;
    padding-bottom: 0;
`;

export interface ClippedFile {
    name: string;
    color: VecRGB;
    hidden: boolean;
    ids: number[];
}

export function ClippedObject({ file }: { file: ClippedFile }) {
    const [colorPickerAnchor, setColorPickerAnchor] = useState<HTMLElement | null>(null);
    const [hidden, setSetHidden] = useState(false);

    // const toggleColorPicker = (event?: MouseEvent<HTMLElement>) => {
    //     setColorPickerAnchor(!colorPickerAnchor && event?.currentTarget ? event.currentTarget : null);
    // };

    const toggleHidden = () => {
        setSetHidden(!hidden);
        toggleHide(!hidden);
    };

    const dispatchHidden = useDispatchHidden();
    const dispatchHighlighted = useDispatchHighlighted();
    const toggleHide = async (hidden: boolean) => {
        if (hidden) {
            dispatchHidden(hiddenActions.add(file.ids));
            dispatchHighlighted(highlightActions.remove(file.ids));
        } else {
            dispatchHidden(hiddenActions.remove(file.ids));
        }
    };

    // const { r, g, b } = vecToRgb(file.color);

    return (
        <>
            <ListItemButton disableRipple onClick={() => {}} sx={{ width: "100%" }}>
                <Box display="flex" width={1} alignItems="center">
                    <Box flex="1 1 auto" overflow="hidden">
                        <Tooltip title={file.name}>
                            <Typography noWrap={true}>{file.name}</Typography>
                        </Tooltip>
                    </Box>
                    <Box flex="0 0 auto">
                        <StyledCheckbox
                            name="toggle group visibility"
                            aria-label="toggle group visibility"
                            size="small"
                            icon={<Visibility htmlColor={`rgba(0,0,0,1)`} />}
                            checkedIcon={<Visibility color="disabled" />}
                            checked={hidden}
                            onClick={(event) => event.stopPropagation()}
                            onChange={toggleHidden}
                        />
                    </Box>
                    {/* <Box flex="0 0 auto">
                        <Button sx={{ padding: 0, alignSelf: "start" }} color="grey" onClick={toggleColorPicker}>
                            <ColorLens sx={{ color: `rgb(${r}, ${g}, ${b})` }} fontSize="small" />
                        </Button>
                    </Box> */}
                </Box>
            </ListItemButton>
            <ColorPicker
                open={Boolean(colorPickerAnchor)}
                anchorEl={colorPickerAnchor}
                onClose={() => setColorPickerAnchor(null)}
                color={file.color}
                onChangeComplete={() => {}}
            />
        </>
    );
}
