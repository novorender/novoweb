import { ReactNode, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SearchPattern, View } from "@novorender/webgl-api";

import { api, dataApi } from "app";
import { uniqueArray } from "utils/misc";

import { FeatureKey, config as featuresConfig, defaultEnabledWidgets } from "config/features";
import { Loading } from "components";
import { Hud } from "features/hud";
import { Render3D } from "features/render";
import { Protected } from "features/protectedRoute";
import { SetPreloadedScene } from "features/render/render";

import { useAppSelector, useAppDispatch } from "app/store";
import { explorerActions } from "slices/explorerSlice";
import { selectAccessToken } from "slices/authSlice";
import { HiddenProvider } from "contexts/hidden";
import { CustomGroupsProvider } from "contexts/customGroups";
import { HighlightedProvider } from "contexts/highlighted";
import { VisibleProvider } from "contexts/visible";
import { getOAuthState } from "utils/auth";

export const defaultSceneId = process.env.REACT_APP_SCENE_ID ?? "95a89d20dd084d9486e383e131242c4c";

export function Explorer() {
    const { id = defaultSceneId } = useParams<{ id?: string }>();
    const dispatch = useAppDispatch();
    const [view, setView] = useState<View>();
    const scene = view?.scene;

    useEffect(() => {
        setView(undefined);
    }, [id]);

    const handleInit = ({ view, customProperties }: { view: View; customProperties: unknown }) => {
        const enabledFeatures = getEnabledFeatures(customProperties);

        if (enabledFeatures) {
            dispatch(explorerActions.setEnabledFeatures(enabledFeaturesToFeatureKeys(enabledFeatures)));
        }

        const oAuthState = getOAuthState();

        if (oAuthState && oAuthState.service === featuresConfig.bimCollab.key) {
            dispatch(explorerActions.setWidgets([featuresConfig.bimCollab.key]));
        } else {
            dispatch(explorerActions.setUrlSearchQuery(getUrlSearchQuery()));
        }

        setView(view);
    };

    return (
        <ContextProviders>
            <AuthCheck id={id}>
                <Render3D id={id} api={api} dataApi={dataApi} onInit={handleInit} />
                {view && scene ? <Hud view={view} scene={scene} /> : null}
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
            if (scene) {
                SetPreloadedScene(scene);
                setStatus(AuthCheckStatus.Public);
            } else {
                setStatus(AuthCheckStatus.RequireAuth);
            }
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
            .concat(defaultEnabledWidgets)
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
                <VisibleProvider>
                    <CustomGroupsProvider>{children}</CustomGroupsProvider>
                </VisibleProvider>
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
