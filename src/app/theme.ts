import { grey } from "@mui/material/colors";
import { alpha, createTheme } from "@mui/material/styles";

declare module "@mui/material/Button" {
    interface ButtonPropsColorOverrides {
        grey: true;
    }
}

declare module "@mui/material" {
    interface Color {
        main: string;
        dark: string;
    }
}

declare module "@mui/material/styles/createTheme" {
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

    interface ThemeOptions {
        customBreakPoints: {
            height: {
                sm: number;
            };
        };
        customShadows: {
            widgetHeader: string;
        };
    }
}

let theme = createTheme({
    breakpoints: {
        values: {
            xs: 0,
            sm: 767,
            md: 1175,
            lg: 1280,
            xl: 2840,
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
        info: {
            main: "#007DFF",
        },
        grey: {
            main: grey[300],
            dark: grey[400],
        },
        // Used by `getContrastText()` to maximize the contrast between
        // the background and the text.
        contrastThreshold: 3,
        // Used by the functions below to shift a color's luminance by approximately
        // two indexes within its tonal palette.
        // E.g., shift from Red 500 to Red 300 or Red 700.
        tonalOffset: 0.2,
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
            sm: 849.95,
        },
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: `
                body {
                    overscroll-behavior: contain;
                    overflow: hidden;
                    background: transparent;

                    
                }

                *, *::before, *::after {
                    touch-action: pan-x pan-y;    
                }

                label {
                    user-select: none;
                }
            `,
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: "none",
                },
            },
        },
        MuiListItem: {
            defaultProps: {
                // @ts-ignore
                component: "li",
            },
        },
        MuiListItemButton: {
            defaultProps: {
                // @ts-ignore
                component: "li",
            },
        },
    },
});

theme = createTheme(theme, {
    components: {
        MuiButton: {
            variants: [
                {
                    props: { variant: "contained", color: "grey" },
                    style: {
                        color: theme.palette.getContrastText(theme.palette.grey[300]),
                    },
                },
                {
                    props: { variant: "outlined", color: "grey" },
                    style: {
                        color: theme.palette.text.primary,
                        borderColor:
                            theme.palette.mode === "light" ? "rgba(0, 0, 0, 0.23)" : "rgba(255, 255, 255, 0.23)",
                        "&.Mui-disabled": {
                            border: `1px solid ${theme.palette.action.disabledBackground}`,
                        },
                        "&:hover": {
                            borderColor:
                                theme.palette.mode === "light" ? "rgba(0, 0, 0, 0.23)" : "rgba(255, 255, 255, 0.23)",
                            backgroundColor: alpha(theme.palette.text.primary, theme.palette.action.hoverOpacity),
                        },
                    },
                },
                {
                    props: { color: "grey", variant: "text" },
                    style: {
                        color: theme.palette.text.primary,
                        "&:hover": {
                            backgroundColor: alpha(theme.palette.text.primary, theme.palette.action.hoverOpacity),
                        },
                    },
                },
            ],
        },
    },
});

export { theme };
