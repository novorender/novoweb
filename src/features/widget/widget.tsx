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
import { Divider } from "components";
import { WidgetMenu } from "features/widgetMenu";
import { Properties } from "features/properties";
import { Bookmarks } from "features/bookmarks";
import { ModelTree } from "features/modelTree";
import { Groups } from "features/groups";
import { useAppSelector, useAppDispatch } from "app/store";
import { selectEnabledWidgets, appActions } from "slices/appSlice";
import { useToggle } from "hooks/useToggle";

import CloseIcon from "@material-ui/icons/Close";
import { ReactComponent as NovorenderIcon } from "media/icons/novorender-small.svg";

const smallFabButtonDiameter = 40;
const useStyles = makeStyles((theme) =>
    createStyles({
        fabClosed: {
            backgroundColor: theme.palette.brand.main,
            "&:hover": {
                backgroundColor: theme.palette.brand.dark,
            },
        },
        fabOpen: {
            backgroundColor: theme.palette.secondary.main,
            "&:hover": {
                backgroundColor: theme.palette.secondary.dark,
            },
        },
        menuContainer: {
            position: "absolute",
            pointerEvents: "auto",
            borderRadius: `${theme.shape.borderRadius}px`,
            maxHeight: `min(calc(70vh - ${theme.spacing(1) + smallFabButtonDiameter + theme.spacing(1)}px), 400px)`,
            height: "100%",
            left: theme.spacing(1),
            right: theme.spacing(1),
            bottom: theme.spacing(1) + smallFabButtonDiameter + theme.spacing(1),
            background: theme.palette.primary.main,
            [theme.breakpoints.up("sm")]: {
                width: 384,
                height: 400,
                maxWidth: 384,
                maxHeight: 400,
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
        dispatch(appActions.removeWidgetSlot(widgetKey));
    };

    if (!config) {
        return null;
    }

    const { name, Icon, key } = config;

    const titleBoxShadow = menuOpen || key !== "modelTree";
    return (
        <>
            <Paper elevation={4} className={classes.menuContainer} data-test={widgetKey}>
                <Box height="100%" display="flex" flexDirection="column">
                    <Box display="flex" p={1} boxShadow={titleBoxShadow ? theme.customShadows.widgetHeader : ""}>
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
                    {!titleBoxShadow ? (
                        <Box px={1}>
                            <Divider />
                        </Box>
                    ) : null}
                    <Box
                        display={menuOpen ? "none" : "block"}
                        flexGrow={1}
                        style={{ overflow: "hidden", overflowY: "hidden" }}
                    >
                        {getWidgetByKey({ key, scene, view })}
                    </Box>
                    <Box display={menuOpen ? "block" : "none"} flexGrow={1} mt={2} mb={2} px={1}>
                        <WidgetMenu widgetKey={widgetKey} onSelect={toggleMenu} />
                    </Box>
                </Box>
            </Paper>
            <SpeedDial
                open={menuOpen}
                onOpen={(_event, reason) => handleToggle(reason)}
                onClose={(_event, reason) => handleToggle(reason)}
                FabProps={{
                    className: menuOpen ? classes.fabOpen : classes.fabClosed,
                    size: isSmall ? "small" : "large",
                }}
                ariaLabel="widgets"
                icon={<SpeedDialIcon icon={<NovorenderIcon />} openIcon={<CloseIcon color="primary" />} />}
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
                <Paper elevation={4} className={classes.menuContainer}>
                    <Box display="flex" p={1} boxShadow={theme.customShadows.widgetHeader}>
                        <Box display="flex" alignItems="center">
                            <NovorenderIcon style={{ fill: theme.palette.brand.main, marginRight: theme.spacing(1) }} />
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
                        <WidgetMenu onSelect={toggle} />
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
                icon={<SpeedDialIcon icon={<NovorenderIcon />} openIcon={<CloseIcon color="primary" />} />}
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
        default:
            return key;
    }
}
