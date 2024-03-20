import { Visibility } from "@mui/icons-material";
import { Box, Checkbox, css, ListItemButton, ListItemButtonProps, styled, Typography } from "@mui/material";
import { useState } from "react";

import { useAppDispatch } from "app";
import { Tooltip } from "components";
import { hiddenActions, useDispatchHidden } from "contexts/hidden";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { vecToRgb } from "utils/color";
import { getFileNameFromPath } from "utils/objectData";

import { clippingOutlineLaserActions, OutlineGroup } from "./outlineLaserSlice";

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

export function ClippedObject({ file }: { file: OutlineGroup }) {
    const [hidden, setSetHidden] = useState(false);
    const dispatch = useAppDispatch();

    const toggleHidden = () => {
        setSetHidden(!hidden);
        toggleHide(!hidden);
    };

    const dispatchHidden = useDispatchHidden();
    const dispatchHighlighted = useDispatchHighlighted();
    const toggleHide = async (hidden: boolean) => {
        dispatch(clippingOutlineLaserActions.toggleHideOutlineGroup({ name: file.name, hide: hidden }));

        if (hidden) {
            dispatchHidden(hiddenActions.add(file.ids));
            dispatchHighlighted(highlightActions.remove(file.ids));
        } else {
            dispatchHidden(hiddenActions.remove(file.ids));
        }
    };

    const { r, g, b } = vecToRgb(file.color);

    return (
        <>
            <ListItemButton disableRipple onClick={() => {}} sx={{ width: "100%" }}>
                <Box display="flex" width={1} alignItems="center">
                    <Box flex="1 1 auto" overflow="hidden">
                        <Tooltip title={file.name}>
                            <Typography noWrap={true}>{getFileNameFromPath(file.name)}</Typography>
                        </Tooltip>
                    </Box>
                    <Box flex="0 0 auto">
                        <StyledCheckbox
                            name="toggle group visibility"
                            aria-label="toggle group visibility"
                            size="small"
                            icon={<Visibility htmlColor={`rgba(${r}, ${g}, ${b}, ${1})`} />}
                            checkedIcon={<Visibility color="disabled" />}
                            checked={hidden}
                            onClick={(event) => event.stopPropagation()}
                            onChange={toggleHidden}
                        />
                    </Box>
                </Box>
            </ListItemButton>
        </>
    );
}
