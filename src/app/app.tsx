import { useCallback, useState, useEffect, RefCallback } from "react";
import CssBaseline from "@material-ui/core/CssBaseline";
import { ThemeProvider } from "@material-ui/core/styles";
import { createAPI, View } from "@novorender/webgl-api";
import { createAPI as createDataAPI } from "@novorender/data-js-api";

import { Hud } from "features/hud";
import { Render3D } from "features/render";
import { fetchEnvironments } from "slices/renderSlice";
import { store, useAppDispatch, useAppSelector } from "app/store";
import { appActions, FullscreenStatus, selectFullscreen } from "slices/appSlice";

import { theme } from "./theme";
import { FeatureKey, config as featuresConfig } from "../config/features";

const api = createAPI();
const dataApi = createDataAPI({ serviceUrl: "https://data.novorender.com/api" });
store.dispatch(fetchEnvironments(api));

export function App() {
    const [view, setView] = useState<View | null>(null);
    const fullscreen = useAppSelector(selectFullscreen);
    const [fullscreenWrapper, setFullScreenWrapper] = useState<HTMLDivElement | null>(null);
    const fullscreenWrapperRef = useCallback<RefCallback<HTMLDivElement>>((el) => setFullScreenWrapper(el), []);

    const dispatch = useAppDispatch();

    const scene = view?.scene;

    // sync app state with browser in case user leaves fullscreen by other methods than through our UI
    useEffect(
        function setupFullScreenListeners() {
            document.onfullscreenchange = () => {
                const exiting = document.fullscreenElement === null;

                if (exiting) {
                    dispatch(appActions.setFullscreen(FullscreenStatus.Windowed));
                } else {
                    dispatch(appActions.setFullscreen(FullscreenStatus.Fullscreen));
                }
            };

            return () => {
                document.onfullscreenchange = null;
            };
        },
        [dispatch]
    );

    useEffect(
        function handleFullScreenRequests() {
            if (!fullscreenWrapper) {
                return;
            }

            if (!document.fullscreenElement && fullscreen === FullscreenStatus.Fullscreen) {
                fullscreenWrapper.requestFullscreen().catch();
            }

            if (document.fullscreenElement && fullscreen === FullscreenStatus.Windowed) {
                document.exitFullscreen().catch();
            }
        },
        [fullscreen, fullscreenWrapper, dispatch]
    );

    const handleInit = ({ view, customProperties }: { view: View; customProperties: unknown }) => {
        const enabledFeatures = getEnabledFeatures(customProperties);

        setView(view);

        if (enabledFeatures) {
            dispatch(appActions.setAvailableFeatures(enabledFeaturesToFeatureKeys(enabledFeatures)));
        }
    };

    return (
        <>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <div ref={fullscreenWrapperRef}>
                    <Render3D api={api} dataApi={dataApi} onInit={handleInit} />
                    {view && scene ? <Hud view={view} scene={scene} /> : null}
                </div>
            </ThemeProvider>
        </>
    );
}

function enabledFeaturesToFeatureKeys(enabledFeatures: Record<string, boolean>): FeatureKey[] {
    const dictionary: Record<string, string | string[] | undefined> = {
        bookmarks: featuresConfig.bookmarks.key,
        // measurement: [featuresConfig.measure.key, featuresConfig.clipping.key],
        properties: featuresConfig.properties.key,
        multiselectionButton: featuresConfig.multipleSelection.key,
        selectionButtons: [featuresConfig.clearSelection.key, featuresConfig.viewOnlySelected.key],
        showHideButtons: featuresConfig.hideSelected.key,
        tree: [featuresConfig.modelTree.key, featuresConfig.groups.key],
    };

    return Object.keys(enabledFeatures)
        .map((key) => ({ key, enabled: enabledFeatures[key] }))
        .filter((feature) => feature.enabled)
        .map((feature) => (dictionary[feature.key] ? dictionary[feature.key]! : feature.key))
        .flat() as FeatureKey[];
}

function getEnabledFeatures(customProperties: unknown): Record<string, boolean> | undefined {
    return customProperties && typeof customProperties === "object" && "enabledFeatures" in customProperties
        ? (customProperties as { enabledFeatures?: Record<string, boolean> }).enabledFeatures
        : undefined;
}
