import {
    TextField as MuiTextField,
    TextFieldProps,
    styled,
    textFieldClasses,
    outlinedInputClasses,
    inputLabelClasses,
} from "@mui/material";
import { css } from "@mui/styled-engine";

export const TextField = styled((props: TextFieldProps) => <MuiTextField size="small" variant="outlined" {...props} />)(
    ({ theme }) => css`
        &.${textFieldClasses.root} {
            & label.${inputLabelClasses.focused} {
                color: ${theme.palette.info.main};
            }

            & .${outlinedInputClasses.root} {
                font-size: 14px;

                & fieldset {
                    border-color: ${theme.palette.grey[300]};
                }

                &:hover fieldset {
                    border-color: ${theme.palette.info.light};
                }

                &.${outlinedInputClasses.focused} fieldset {
                    border-color: ${theme.palette.info.main};
                }
            }
        }
    `
);
