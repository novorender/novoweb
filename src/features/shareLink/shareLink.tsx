import { useStore } from "react-redux";
import { CameraControllerParams, RenderSettings } from "@novorender/webgl-api";
import { Close } from "@mui/icons-material";
import { Snackbar, IconButton, Typography } from "@mui/material";

import { WidgetMenuButtonWrapper } from "components";
import { useToggle } from "hooks/useToggle";
import { config as featuresConfig } from "config/features";
import { selectMainObject } from "slices/renderSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";

export function ShareLink() {
    const store = useStore();
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const { Icon, name } = featuresConfig.shareLink;
    const [open, toggle] = useToggle();

    const createLink = async () => {
        const { display: _display, environment: _environment, ...settingsToInclude } = view.settings;
        const mainObject = selectMainObject(store.getState());

        try {
            const dataString = formatUrlData({
                mainObject,
                camera: view.camera.controller.params,
                settings: settingsToInclude,
            });

            await navigator.clipboard.writeText(`${window.location.href.split("#")[0]}#${dataString}`);

            toggle();
        } catch (e) {
            console.warn(e);
        }
    };

    return (
        <>
            <Snackbar
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                sx={{ width: { xs: "auto", sm: 350 }, bottom: { xs: "auto", sm: 24 }, top: { xs: 24, sm: "auto" } }}
                autoHideDuration={2500}
                open={open}
                onClose={toggle}
                message="Copied to clipboard"
                action={
                    <IconButton size="small" aria-label="close" color="inherit" onClick={toggle}>
                        <Close fontSize="small" />
                    </IconButton>
                }
            />
            <WidgetMenuButtonWrapper onClick={createLink}>
                <IconButton size="large">
                    <Icon />
                </IconButton>
                <Typography>{name}</Typography>
            </WidgetMenuButtonWrapper>
        </>
    );
}

type UrlData = {
    camera?: CameraControllerParams;
    settings?: Partial<RenderSettings>;
    mainObject?: number;
};

function formatUrlData(data: UrlData): string {
    return btoa(JSON.stringify(data));
}

export function getDataFromUrlHash(): UrlData {
    try {
        return window.location.hash ? JSON.parse(atob(window.location.hash.slice(1))) : {};
    } catch (e) {
        console.warn(e);
        return {};
    }
}
