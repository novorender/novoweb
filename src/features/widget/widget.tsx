import { useTheme, Paper, Box, Typography, IconButton, styled, PaperProps } from "@mui/material";
import { css } from "@mui/styled-engine";
import CloseIcon from "@mui/icons-material/Close";

import { featuresConfig, WidgetKey } from "config/features";
import { useToggle } from "hooks/useToggle";

import { LogoSpeedDial } from "components";
import { WidgetList } from "features/widgetList";
import { Properties } from "features/properties";
import { Bookmarks } from "features/bookmarks";
import { ModelTree } from "features/modelTree";
import { Search } from "features/search";
import { ClippingBox } from "features/clippingBox";
import { Measure } from "features/measure";
import { Groups } from "features/groups";
import { ClippingPlanes } from "features/clippingPlanes";
import { ViewerScenes } from "features/viewerScenes";
import { OrthoCam } from "features/orthoCam";
import { AdvancedSettings } from "features/advancedSettings";
import { Layers } from "features/layers";

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
        display: flex;
        flex-direction: column;

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
};

export function Widget({ widgetKey }: Props) {
    const [menuOpen, toggleMenu] = useToggle(false);

    // TODO(OLA): Fix this. Probably move full widget w/ header to each feature.
    /*     const headerShadow =
        menuOpen ||
        !(
            [
                featuresConfig.search.key,
                featuresConfig.measure.key,
                featuresConfig.bookmarks.key,
                featuresConfig.viewerScenes.key,
                featuresConfig.clippingBox.key,
                featuresConfig.clippingPlanes.key,
                featuresConfig.layers.key,
            ] as string[]
        ).includes(key); */

    return (
        <>
            <WidgetContainer data-test={`${widgetKey}-widget`}>
                {getWidgetByKey(widgetKey)}
                <WidgetList widgetKey={widgetKey} onSelect={toggleMenu} />
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${widgetKey}-widget-menu-fab`}
                ariaLabel="widgets"
            />
        </>
    );
}

export function MenuWidget() {
    const theme = useTheme();

    const [open, toggle] = useToggle(false);

    return (
        <>
            {open ? (
                <WidgetContainer data-test="menu-widget" sx={{ height: 1, display: "flex", flexDirection: "column" }}>
                    <Box height="100%" display="flex" flexDirection="column">
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

                        <WidgetList onSelect={toggle} />
                    </Box>
                </WidgetContainer>
            ) : null}
            <LogoSpeedDial open={open} toggle={toggle} testId="widget-menu-fab" ariaLabel="widgets" />
        </>
    );
}

function getWidgetByKey(key: WidgetKey): JSX.Element | string {
    switch (key) {
        case featuresConfig.properties.key:
            return <Properties />;
        case featuresConfig.bookmarks.key:
            return <Bookmarks />;
        case featuresConfig.groups.key:
            return <Groups />;
        case featuresConfig.modelTree.key:
            return <ModelTree />;
        case featuresConfig.search.key:
            return <Search />;
        case featuresConfig.clippingBox.key:
            return <ClippingBox />;
        case featuresConfig.measure.key:
            return <Measure />;
        case featuresConfig.viewerScenes.key:
            return <ViewerScenes />;
        case featuresConfig.clippingPlanes.key:
            return <ClippingPlanes />;
        case featuresConfig.orthoCam.key:
            return <OrthoCam />;
        case featuresConfig.advancedSettings.key:
            return <AdvancedSettings />;
        case featuresConfig.layers.key:
            return <Layers />;
        default:
            return key;
    }
}
