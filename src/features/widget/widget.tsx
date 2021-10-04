import {
    useTheme,
    useMediaQuery,
    Paper,
    Box,
    Typography,
    IconButton,
    createStyles,
    makeStyles,
    FabProps,
} from "@material-ui/core";
import { OpenReason, CloseReason, SpeedDial, SpeedDialIcon } from "@material-ui/lab";
import type { Scene, View } from "@novorender/webgl-api";

import type { WidgetKey } from "config/features";
import { WidgetList } from "features/widgetList";
import { Properties } from "features/properties";
import { Bookmarks } from "features/bookmarks";
import { ModelTree } from "features/modelTree";
import { Groups } from "features/groups";
import { useAppSelector, useAppDispatch } from "app/store";
import { selectEnabledWidgets, explorerActions } from "slices/explorerSlice";
import { useToggle } from "hooks/useToggle";

import CloseIcon from "@material-ui/icons/Close";
import { ReactComponent as NovorenderIcon } from "media/icons/novorender-small.svg";
import { Search } from "features/search";
import { Clipping } from "features/clipping";

const useStyles = makeStyles((theme) =>
    createStyles({
        fabClosed: {
            backgroundColor: theme.palette.primary.main,
            "&:hover": {
                backgroundColor: theme.palette.primary.dark,
            },
        },
        fabOpen: {
            backgroundColor: theme.palette.secondary.main,
            "&:hover": {
                backgroundColor: theme.palette.secondary.dark,
            },
        },
        widgetContainer: {
            position: "absolute",
            pointerEvents: "auto",
            borderRadius: `${theme.shape.borderRadius}px`,
            maxHeight: `min(50vh, 400px)`,
            height: "100%",
            left: theme.spacing(1),
            right: theme.spacing(1),
            top: theme.spacing(1),
            background: theme.palette.common.white,
            [theme.breakpoints.up("sm")]: {
                minWidth: 384,
                maxWidth: "20vw",
                width: "100%",
                minHeight: 350,
                maxHeight: "44vh",
                position: "static",
                transform: "translateX(-20px) translateY(40px);",
            },
            [theme.breakpoints.up("md")]: {
                transform: "translateX(-30px) translateY(46px);",
            },
        },
    })
);

type Props = {
    widgetKey: WidgetKey;
    scene: Scene;
    view: View;
};

export function Widget({ widgetKey, scene, view }: Props) {
    const classes = useStyles();
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
    const [menuOpen, toggleMenu] = useToggle(false);

    const enabledWidgets = useAppSelector(selectEnabledWidgets);
    const dispatch = useAppDispatch();

    const config = widgetKey ? enabledWidgets.find((widget) => widget.key === widgetKey) : undefined;

    const handleToggle = (reason: OpenReason | CloseReason) => {
        if (!["toggle", "escapeKeyDown"].includes(reason)) {
            return;
        }

        toggleMenu();
    };

    const handleClose = () => {
        dispatch(explorerActions.removeWidgetSlot(widgetKey));
    };

    if (!config) {
        return null;
    }

    const { name, Icon, key } = config;

    return (
        <>
            <Paper elevation={4} className={classes.widgetContainer} data-test={`${widgetKey}-widget`}>
                <Box height="100%" display="flex" flexDirection="column">
                    <Box display="flex" p={1} boxShadow={theme.customShadows.widgetHeader}>
                        <Box display="flex" alignItems="center">
                            <Icon style={{ marginRight: theme.spacing(1) }} />
                            <Typography variant="h6" component="h2">
                                {name}
                            </Typography>
                        </Box>
                        <Box ml="auto">
                            <IconButton data-test="close-widget" size="small" onClick={handleClose}>
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </Box>
                    <Box
                        display={menuOpen ? "none" : "block"}
                        flexGrow={1}
                        style={{ overflow: "hidden", overflowY: "hidden" }}
                    >
                        {getWidgetByKey({ key, scene, view })}
                    </Box>
                    <Box display={menuOpen ? "block" : "none"} flexGrow={1} mt={2} mb={2} px={1}>
                        <WidgetList widgetKey={widgetKey} onSelect={toggleMenu} />
                    </Box>
                </Box>
            </Paper>
            <SpeedDial
                open={menuOpen}
                onOpen={(_event, reason) => handleToggle(reason)}
                onClose={(_event, reason) => handleToggle(reason)}
                FabProps={
                    {
                        className: menuOpen ? classes.fabOpen : classes.fabClosed,
                        size: isSmall ? "small" : "large",
                        "data-test": `${widgetKey}-widget-menu-fab`,
                    } as Partial<FabProps<"button", { "data-test": string }>>
                }
                ariaLabel="widgets"
                icon={<SpeedDialIcon icon={<NovorenderIcon />} openIcon={<CloseIcon />} />}
            />
        </>
    );
}

export function MenuWidget() {
    const classes = useStyles();
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

    const [open, toggle] = useToggle(false);

    const handleToggle = (reason: OpenReason | CloseReason) => {
        if (!["toggle", "escapeKeyDown"].includes(reason)) {
            return;
        }

        toggle();
    };

    return (
        <>
            {open ? (
                <Paper elevation={4} className={classes.widgetContainer} data-test="menu-widget">
                    <Box display="flex" p={1} boxShadow={theme.customShadows.widgetHeader}>
                        <Box display="flex" alignItems="center">
                            <NovorenderIcon
                                style={{ fill: theme.palette.primary.main, marginRight: theme.spacing(1) }}
                            />
                            <Typography variant="body1" component="h2">
                                Functions
                            </Typography>
                        </Box>
                        <Box ml="auto">
                            <IconButton size="small" onClick={toggle}>
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </Box>
                    <Box p={1} mt={1}>
                        <WidgetList onSelect={toggle} />
                    </Box>
                </Paper>
            ) : null}
            <SpeedDial
                open={open}
                onOpen={(_event, reason) => handleToggle(reason)}
                onClose={(_event, reason) => handleToggle(reason)}
                FabProps={
                    {
                        className: open ? classes.fabOpen : classes.fabClosed,
                        size: isSmall ? "small" : "large",
                        "data-test": "widget-menu-fab",
                    } as Partial<FabProps<"button", { "data-test": string }>>
                }
                ariaLabel="widgets"
                icon={<SpeedDialIcon icon={<NovorenderIcon />} openIcon={<CloseIcon />} />}
            />
        </>
    );
}

function getWidgetByKey({ key, scene, view }: { key: WidgetKey; scene: Scene; view: View }): JSX.Element | string {
    switch (key) {
        case "properties":
            return <Properties scene={scene} />;
        case "bookmarks":
            return <Bookmarks view={view} />;
        case "groups":
            return <Groups />;
        case "modelTree":
            return <ModelTree scene={scene} />;
        case "search":
            return <Search scene={scene} />;
        case "clipping":
            return <Clipping />;
        default:
            return key;
    }
}
