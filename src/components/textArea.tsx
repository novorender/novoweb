import { styled, TextareaAutosize, TextareaAutosizeProps } from "@mui/material";
import { css } from "@mui/styled-engine";

export const TextArea = styled((props: TextareaAutosizeProps) => <TextareaAutosize minRows={3} {...props} />)(
    ({ theme }) =>
        css`
            width: 100%;
            max-width: 100%;
            font-size: 14px;
            padding: 8px 12px;
            border: 2px solid ${theme.palette.grey[300]};
            border-radius: 4px;
            transition: border-color 0.2s ease-in-out;

            &:hover {
                border-color: ${theme.palette.info.light};
            }

            &:focus {
                border-color: ${theme.palette.info.main};
                outline: none;
            }
        `
);
