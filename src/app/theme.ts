import { createTheme } from "@material-ui/core/styles";

declare module "@material-ui/core/styles/createTheme" {
    interface Theme {
        customBreakPoints: {
            height: {
                sm: number;
            };
        };
        customShadows: {
            widgetHeader: string;
        };
    }
    // allow configuration using `createTheme`
    interface ThemeOptions {
        customBreakPoints?: {
            height?: {
                sm?: number;
            };
        };
        customShadows?: {
            widgetHeader?: string;
        };
    }
}

export const theme = createTheme({
    breakpoints: {
        values: {
            xs: 0,
            sm: 767,
            md: 1100,
            lg: 1280,
            xl: 1920,
        },
    },
    palette: {
        primary: {
            // light: will be calculated from palette.primary.main,
            main: "#D61E5C",
            // dark: will be calculated from palette.primary.main,
            // contrastText: will be calculated to contrast with palette.primary.main
        },
        secondary: {
            // light: '#0066ff',
            main: "#253746",
            // dark: will be calculated from palette.secondary.main,
            // contrastText: 'white',
        },
        text: {
            primary: "#253746",
        },
        // Used by `getContrastText()` to maximize the contrast between
        // the background and the text.
        contrastThreshold: 3,
        // Used by the functions below to shift a color's luminance by approximately
        // two indexes within its tonal palette.
        // E.g., shift from Red 500 to Red 300 or Red 700.
        tonalOffset: 0.2,
    },
    props: {
        MuiPaper: {
            elevation: 1,
        },
    },
    typography: {
        fontFamily: ["Open Sans", "Roboto", "Helvetica", "sans-serif"].join(","),
        h6: {
            fontSize: "1.125rem",
            fontWeight: 400,
            lineHeight: 1,
        },
        body2: {
            fontWeight: 600,
        },
    },
    customShadows: {
        widgetHeader: "0px 5px 5px rgba(0, 0, 0, 0.05)",
    },
    customBreakPoints: {
        height: {
            sm: 949.95,
        },
    },
    overrides: {
        MuiButton: {
            root: {
                textTransform: "none",
            },
        },
    },
});
