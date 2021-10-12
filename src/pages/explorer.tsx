import { ReactNode, useEffect, RefCallback, useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { SearchPattern, View } from "@novorender/webgl-api";

import { api, dataApi } from "app";
import { useAppSelector, useAppDispatch } from "app/store";
import { Loading } from "components";
import { Hud } from "features/hud";
import { Render3D } from "features/render";
import { Protected } from "features/protectedRoute";
import { FeatureKey, config as featuresConfig } from "config/features";
import { explorerActions, FullscreenStatus, selectFullscreen } from "slices/explorerSlice";
import { selectAccessToken } from "slices/authSlice";
import { HiddenProvider } from "contexts/hidden";
import { CustomGroupsProvider } from "contexts/customGroups";
import { HighlightedProvider } from "contexts/highlighted";
import { uniqueArray } from "utils/misc";

export function Explorer() {
    const { id = process.env.REACT_APP_SCENE_ID ?? "95a89d20dd084d9486e383e131242c4c" } = useParams<{ id?: string }>();
    const fullscreen = useAppSelector(selectFullscreen);

    const [view, setView] = useState<View>();
    const [fullscreenWrapper, setFullScreenWrapper] = useState<HTMLDivElement | null>(null);
    const fullscreenWrapperRef = useCallback<RefCallback<HTMLDivElement>>((el) => setFullScreenWrapper(el), []);

    const dispatch = useAppDispatch();

    const scene = view?.scene;

    useEffect(() => {
        setView(undefined);
    }, [id]);

    // sync app state with browser in case user leaves fullscreen by other methods than through our UI
    useEffect(
        function setupFullScreenListeners() {
            document.onfullscreenchange = () => {
                const exiting = document.fullscreenElement === null;

                if (exiting) {
                    dispatch(explorerActions.setFullscreen(FullscreenStatus.Windowed));
                } else {
                    dispatch(explorerActions.setFullscreen(FullscreenStatus.Fullscreen));
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

        if (enabledFeatures) {
            dispatch(explorerActions.setEnabledFeatures(enabledFeaturesToFeatureKeys(enabledFeatures)));
        }

        dispatch(explorerActions.setUrlSearchQuery(getUrlSearchQuery()));
        setView(view);
    };

    return (
        <ContextProviders>
            <AuthCheck id={id}>
                <div ref={fullscreenWrapperRef}>
                    <Render3D id={id} api={api} dataApi={dataApi} onInit={handleInit} />
                    {view && scene ? <Hud view={view} scene={scene} /> : null}
                </div>
            </AuthCheck>
        </ContextProviders>
    );
}

enum AuthCheckStatus {
    Pending,
    RequireAuth,
    Public,
}

/**
 * Loading a scene that requires authentication or a scene that does not exist returns an empty response.
 * Attempt to load the scene unauthenticated to check if it is public. Assume that it requires authentication if it is empty.
 */

function AuthCheck({ id, children }: { id: string; children: ReactNode }) {
    const accessToken = useAppSelector(selectAccessToken);
    const dispatch = useAppDispatch();

    // Skip auth-check if token already exists and handle missing scene in child component
    const [status, setStatus] = useState(accessToken ? AuthCheckStatus.RequireAuth : AuthCheckStatus.Pending);

    useEffect(() => {
        if (status === AuthCheckStatus.Pending) {
            tryLoadingSceneUnauthenticated();
        }

        async function tryLoadingSceneUnauthenticated() {
            if (!id) {
                return;
            }

            const scene = await dataApi.loadScene(id).catch(() => undefined);
            setStatus(scene === undefined ? AuthCheckStatus.RequireAuth : AuthCheckStatus.Public);
        }
    }, [status, dispatch, id, accessToken]);

    if (status === AuthCheckStatus.Pending) {
        return <Loading />;
    }

    if (status === AuthCheckStatus.Public) {
        return <>{children}</>;
    }

    return <Protected>{children}</Protected>;
}

function enabledFeaturesToFeatureKeys(enabledFeatures: Record<string, boolean>): FeatureKey[] {
    const dictionary: Record<string, string | string[] | undefined> = {
        bookmarks: featuresConfig.bookmarks.key,
        measurement: featuresConfig.measure.key,
        clipping: featuresConfig.clipping.key,
        properties: featuresConfig.properties.key,
        tree: featuresConfig.modelTree.key,
        groups: featuresConfig.groups.key,
        search: featuresConfig.search.key,
    };

    return uniqueArray(
        Object.keys(enabledFeatures)
            .map((key) => ({ key, enabled: enabledFeatures[key] }))
            .filter((feature) => feature.enabled)
            .map((feature) => (dictionary[feature.key] ? dictionary[feature.key]! : feature.key))
            .flat() as FeatureKey[]
    );
}

function getEnabledFeatures(customProperties: unknown): Record<string, boolean> | undefined {
    return customProperties && typeof customProperties === "object" && "enabledFeatures" in customProperties
        ? (customProperties as { enabledFeatures?: Record<string, boolean> }).enabledFeatures
        : undefined;
}

function ContextProviders({ children }: { children: ReactNode }) {
    return (
        <HighlightedProvider>
            <HiddenProvider>
                <CustomGroupsProvider>{children}</CustomGroupsProvider>
            </HiddenProvider>
        </HighlightedProvider>
    );
}

function getUrlSearchQuery(): undefined | string | SearchPattern[] {
    const searchQuery = new URLSearchParams(window.location.search).get("search");

    if (!searchQuery) {
        return;
    }

    try {
        const patterns = JSON.parse(searchQuery) as unknown;
        const patternArray = Array.isArray(patterns) ? patterns : [patterns];
        const validPatterns = patternArray.filter(
            (pattern): pattern is SearchPattern =>
                typeof pattern === "object" &&
                "property" in pattern &&
                Boolean(pattern.property) &&
                "value" in pattern &&
                Boolean(pattern.value)
        );

        if (validPatterns.length) {
            return validPatterns;
        }
    } catch {
        return searchQuery;
    }
}
