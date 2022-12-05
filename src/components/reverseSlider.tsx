import { createTheme, Slider, sliderClasses, SliderProps, styled, ThemeProvider } from "@mui/material";

import { theme } from "app/theme";

const rtl = createTheme(theme, {
    direction: "rtl",
});

const StyledSlider = styled(Slider)`
    &.${sliderClasses.root} {
        & .${sliderClasses.thumb} {
            margin-right: -20px;
            margin-left: 0px;
        }

        & .${sliderClasses.track} {
            border: 1px solid white;
        }

        & .${sliderClasses.rail} {
            border-top: 1px solid currentColor;
            border-bottom: 1px solid currentColor;
        }

        &.${sliderClasses.disabled} {
            & .${sliderClasses.track} {
                background-color: hsl(0, 0%, 89.2%);
            }
        }
    }
`;

export function ReverseSlider(props: SliderProps) {
    return (
        <ThemeProvider theme={rtl}>
            <StyledSlider track="inverted" {...props} />
        </ThemeProvider>
    );
}
