import { styled, Switch, switchClasses } from "@mui/material/";
import { css } from "@mui/styled-engine";

export const IosSwitch = styled(Switch)(
    ({ theme }) => css`
        &.${switchClasses.root} {
            width: 48px;
            height: 24px;
            padding: 0;
            margin: ${theme.spacing(1)};
        }

        & .${switchClasses.switchBase} {
            padding: 1px;
            color: ${theme.palette.grey[600]};

            &.${switchClasses.checked} {
                transform: "translateX(23px)";
                color: ${theme.palette.primary.main};

                & + .${switchClasses.track} {
                    opacity: 0.1;
                }
            }
        }

        & .${switchClasses.thumb} {
            margin-top: 2px;
            margin-left: 3px;
            width: 18px;
            height: 18px;
        }

        & .${switchClasses.track} {
            border-radius: ${24 / 2}px;
            color: ${theme.palette.grey[600]};
            opacity: 0.1;
        }
    `
);
