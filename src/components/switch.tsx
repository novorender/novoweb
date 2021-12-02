import { styled, Switch as MuiSwitch, switchClasses } from "@mui/material";
import { css } from "@mui/styled-engine";

export const Switch = styled(MuiSwitch)(
    ({ theme }) => css`
        &.${switchClasses.root} {
            width: 28px;
            height: 16px;
            padding: 0;
            display: flex;
        }

        & .${switchClasses.switchBase} {
            padding: 3px;
            color: ${theme.palette.grey[500]};

            &.${switchClasses.checked} {
                transform: translateX(12px);
                color: ${theme.palette.common.white};

                & + .${switchClasses.track} {
                    opacity: 1;
                    background-color: ${theme.palette.primary.main};
                    border-color: ${theme.palette.primary.main};
                }
            }
        }

        & .${switchClasses.thumb} {
            width: 10px;
            height: 10px;
            box-shadow: none;
            color: ${theme.palette.common.white};
        }

        & .${switchClasses.track} {
            background-color: ${theme.palette.grey[500]};
            border: 1px solid ${theme.palette.grey[500]};
            border-radius: ${16 / 2}px;
            opacity: 1;
        }
    `
);
