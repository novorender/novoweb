import {
    Accordion as MuiAccordion,
    accordionClasses,
    AccordionProps,
    collapseClasses,
    Color,
    styled,
} from "@mui/material";
import { css } from "@mui/styled-engine";

export const Accordion = styled(MuiAccordion, { shouldForwardProp: (prop) => prop !== "level" })<
    AccordionProps & { level?: number }
>(
    ({ theme, level }) => css`
        box-shadow: none;
        padding: 0;
        margin: 0;
        background: none;

        &::before {
            display: none;
        }

        &.${accordionClasses.root} {
            &.${accordionClasses.expanded} {
                margin: 0 0 ${theme.spacing(1)};

                & > .${collapseClasses.root} {
                    flex: 1;
                    & > .${collapseClasses.wrapper} {
                        height: 100%;
                        & .${accordionClasses.region} {
                            height: 100%;
                        }
                    }
                }
            }
        }

        &.${accordionClasses.expanded} {
            background: ${theme.palette.grey[(100 * (level ?? 1)) as keyof Color]};
            margin: 0;
        }

        &.${accordionClasses.disabled} {
            background: ${theme.palette.common.white};
        }
    `,
);
