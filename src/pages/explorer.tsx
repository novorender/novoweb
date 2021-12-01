import { ReactNode, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SearchPattern } from "@novorender/webgl-api";

import { dataApi } from "app";
import { uniqueArray } from "utils/misc";

import {
    config as featuresConfig,
    defaultEnabledWidgets,
    defaultEnabledAdminWidgets,
    WidgetKey,
} from "config/features";
import { Loading } from "components";
import { Hud } from "features/hud";
import { Render3D } from "features/render";
import { Protected } from "features/protectedRoute";

import { useAppSelector, useAppDispatch } from "app/store";
import { explorerActions, SceneType } from "slices/explorerSlice";
import { selectAccessToken } from "slices/authSlice";
import { HiddenProvider } from "contexts/hidden";
import { CustomGroupsProvider } from "contexts/customGroups";
import { HighlightedProvider } from "contexts/highlighted";
import { VisibleProvider } from "contexts/visible";
import { explorerGlobalsActions, ExplorerGlobalsProvider, useExplorerGlobals } from "contexts/explorerGlobals";

export function Explorer() {
    return (
        <ContextProviders>
            <ExplorerBase />
        </ContextProviders>
    );
}

function ExplorerBase() {
    const { id = process.env.REACT_APP_SCENE_ID ?? "95a89d20dd084d9486e383e131242c4c" } = useParams<{ id?: string }>();
    const dispatch = useAppDispatch();
    const {
        state: { view, scene },
        dispatch: dispatchGlobals,
    } = useExplorerGlobals();

    useEffect(() => {
        dispatchGlobals(explorerGlobalsActions.update({ view: undefined, scene: undefined }));
    }, [id, dispatchGlobals]);

    const handleInit = ({ customProperties }: { customProperties: unknown }) => {
        const isAdmin = !getIsViewerScene(customProperties);
        dispatch(explorerActions.setSceneType(isAdmin ? SceneType.Admin : SceneType.Viewer));

        const enabledFeatures = getEnabledFeatures(customProperties);

        if (isAdmin) {
            dispatch(explorerActions.setEnabledWidgets(defaultEnabledAdminWidgets));
        } else if (enabledFeatures) {
            dispatch(explorerActions.setEnabledWidgets(enabledFeaturesToFeatureKeys(enabledFeatures)));
        }

        dispatch(explorerActions.setUrlSearchQuery(getUrlSearchQuery()));
    };

    return (
        <AuthCheck id={id}>
            <Render3D id={id} onInit={handleInit} />
            {view && scene ? <Hud /> : null}
        </AuthCheck>
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
    const { dispatch: dispatchGlobals } = useExplorerGlobals();

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
            if (scene) {
                dispatchGlobals(explorerGlobalsActions.update({ preloadedScene: scene }));
                setStatus(AuthCheckStatus.Public);
            } else {
                setStatus(AuthCheckStatus.RequireAuth);
            }
        }
    }, [status, dispatch, id, accessToken, dispatchGlobals]);

    if (status === AuthCheckStatus.Pending) {
        return <Loading />;
    }

    if (status === AuthCheckStatus.Public) {
        return <>{children}</>;
    }

    return <Protected>{children}</Protected>;
}

function enabledFeaturesToFeatureKeys(enabledFeatures: Record<string, boolean>): WidgetKey[] {
    const dictionary: Record<string, string | string[] | undefined> = {
        bookmarks: featuresConfig.bookmarks.key,
        measurement: [featuresConfig.measure.key, featuresConfig.orthoCam.key],
        clipping: [featuresConfig.clippingBox.key, featuresConfig.clippingPlanes.key],
        properties: featuresConfig.properties.key,
        tree: featuresConfig.modelTree.key,
        groups: featuresConfig.groups.key,
        search: featuresConfig.search.key,
    };

    const features: Record<string, boolean> = {
        ...enabledFeatures,
        [featuresConfig.shareLink.key]: !enabledFeatures.disableLink,
    };

    return uniqueArray(
        Object.keys(features)
            .map((key) => ({ key, enabled: features[key] }))
            .filter((feature) => feature.enabled)
            .map((feature) => (dictionary[feature.key] ? dictionary[feature.key]! : feature.key))
            .concat(defaultEnabledWidgets)
            .flat() as WidgetKey[]
    );
}

function getEnabledFeatures(customProperties: unknown): Record<string, boolean> | undefined {
    return customProperties && typeof customProperties === "object" && "enabledFeatures" in customProperties
        ? (customProperties as { enabledFeatures?: Record<string, boolean> }).enabledFeatures
        : undefined;
}

function getIsViewerScene(customProperties: unknown): boolean {
    return customProperties && typeof customProperties === "object" && "isViewer" in customProperties
        ? (customProperties as { isViewer: boolean }).isViewer
        : false;
}

function ContextProviders({ children }: { children: ReactNode }) {
    return (
        <ExplorerGlobalsProvider>
            <HighlightedProvider>
                <HiddenProvider>
                    <VisibleProvider>
                        <CustomGroupsProvider>{children}</CustomGroupsProvider>
                    </VisibleProvider>
                </HiddenProvider>
            </HighlightedProvider>
        </ExplorerGlobalsProvider>
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
