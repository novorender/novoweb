import {
    useTheme,
    useMediaQuery,
    Paper,
    Box,
    Typography,
    IconButton,
    FabProps,
    styled,
    SpeedDial,
    SpeedDialIcon,
    PaperProps,
    OpenReason,
    CloseReason,
} from "@mui/material";
import { css } from "@mui/styled-engine";
import type { Scene, View } from "@novorender/webgl-api";

import { Divider } from "components";
import { config as featuresConfig, WidgetKey } from "config/features";
import { WidgetList } from "features/widgetList";
import { Properties } from "features/properties";
import { Bookmarks } from "features/bookmarks";
import { ModelTree } from "features/modelTree";
import { Search } from "features/search";
import { Clipping } from "features/clipping";
import { Measure } from "features/measure";
import { Groups } from "features/groups";
import { useAppSelector, useAppDispatch } from "app/store";
import { selectEnabledWidgets, explorerActions } from "slices/explorerSlice";
import { useToggle } from "hooks/useToggle";

import CloseIcon from "@mui/icons-material/Close";
import { ReactComponent as NovorenderIcon } from "media/icons/novorender-small.svg";

const WidgetContainer = styled((props: PaperProps) => <Paper elevation={4} {...props} />)(
    ({ theme }) => css`
        pointer-events: auto;
        border-radius: ${theme.shape.borderRadius}px;
        max-height: min(50vh, 400px);
        height: 100%;
        position: absolute;
        left: ${theme.spacing(1)};
        right: ${theme.spacing(1)};
        top: ${theme.spacing(1)};

        ${theme.breakpoints.up("sm")} {
            min-width: 384px;
            max-width: 20vw;
            width: 100%;
            min-height: 350px;
            max-height: calc(50% - 80px);
            position: static;
            transform: translateX(-20px) translateY(40px);
        }

        ${theme.breakpoints.up("md")} {
            transform: translateX(-30px) translateY(46px);
        }
    `
);

type Props = {
    widgetKey: WidgetKey;
    scene: Scene;
    view: View;
};

export function Widget({ widgetKey, scene, view }: Props) {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("md"));
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
    const headerShadow =
        menuOpen || !([featuresConfig.search.key, featuresConfig.measure.key] as string[]).includes(key);

    return (
        <>
            <WidgetContainer data-test={`${widgetKey}-widget`}>
                <Box height="100%" display="flex" flexDirection="column">
                    <Box display="flex" p={1} boxShadow={headerShadow ? theme.customShadows.widgetHeader : "none"}>
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
                    {!headerShadow ? (
                        <Box px={1}>
                            <Divider />
                        </Box>
                    ) : null}
                    <Box
                        display={menuOpen ? "none" : "block"}
                        flexGrow={1}
                        style={{ overflow: "hidden", overflowY: "hidden" }}
                        height={1}
                    >
                        {getWidgetByKey({ key, scene, view })}
                    </Box>
                    <Box display={menuOpen ? "block" : "none"} flexGrow={1} mt={2} mb={2} px={1}>
                        <WidgetList widgetKey={widgetKey} onSelect={toggleMenu} />
                    </Box>
                </Box>
            </WidgetContainer>
            <SpeedDial
                open={menuOpen}
                onOpen={(_event, reason) => handleToggle(reason)}
                onClose={(_event, reason) => handleToggle(reason)}
                FabProps={
                    {
                        color: menuOpen ? "secondary" : "primary",
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
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("md"));

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
                <WidgetContainer data-test="menu-widget">
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
                </WidgetContainer>
            ) : null}
            <SpeedDial
                open={open}
                onOpen={(_event, reason) => handleToggle(reason)}
                onClose={(_event, reason) => handleToggle(reason)}
                FabProps={
                    {
                        color: open ? "secondary" : "primary",
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
        case featuresConfig.properties.key:
            return <Properties scene={scene} />;
        case featuresConfig.bookmarks.key:
            return <Bookmarks view={view} />;
        case featuresConfig.groups.key:
            return <Groups />;
        case featuresConfig.modelTree.key:
            return <ModelTree scene={scene} />;
        case featuresConfig.search.key:
            return <Search view={view} scene={scene} />;
        case featuresConfig.clipping.key:
            return <Clipping />;
        case featuresConfig.measure.key:
            return <Measure />;
        default:
            return key;
    }
}
