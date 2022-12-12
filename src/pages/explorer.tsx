import { ReactNode, useEffect } from "react";
import { SearchPattern } from "@novorender/webgl-api";

import { uniqueArray } from "utils/misc";
import { getOAuthState } from "utils/auth";
import { useSceneId } from "hooks/useSceneId";

import {
    featuresConfig,
    defaultEnabledWidgets,
    defaultEnabledAdminWidgets,
    WidgetKey,
    defaultLockedWidgets,
    allWidgets,
} from "config/features";
import { Hud } from "features/hud";
import { Render3D } from "features/render";
import { Consent } from "features/consent";

import { useAppSelector, useAppDispatch } from "app/store";
import { explorerActions, PrimaryMenuConfigType, SceneType, UserRole } from "slices/explorerSlice";
import { selectUser } from "slices/authSlice";
import { HiddenProvider } from "contexts/hidden";
import { ObjectGroupsProvider } from "contexts/objectGroups";
import { HighlightedProvider } from "contexts/highlighted";
import { SelectionBasketProvider } from "contexts/selectionBasket";
import { explorerGlobalsActions, ExplorerGlobalsProvider, useExplorerGlobals } from "contexts/explorerGlobals";
import { MsalInteraction } from "features/msalInteraction";

export function Explorer() {
    return (
        <ContextProviders>
            <ExplorerBase />
        </ContextProviders>
    );
}

const disableHud = new URLSearchParams(window.location.search).get("disableHud") === "true";

function ExplorerBase() {
    const id = useSceneId();
    const user = useAppSelector(selectUser);
    const dispatch = useAppDispatch();
    const {
        state: { view, scene },
        dispatch: dispatchGlobals,
    } = useExplorerGlobals();

    useEffect(() => {
        dispatchGlobals(explorerGlobalsActions.update({ view: undefined, scene: undefined }));
    }, [id, dispatchGlobals]);

    const handleInit = ({ customProperties }: { customProperties: unknown }) => {
        const isAdminScene = !getIsViewerScene(customProperties);
        const userRole = isAdminScene ? UserRole.Admin : getUserRole(customProperties);
        dispatch(explorerActions.setSceneType(isAdminScene ? SceneType.Admin : SceneType.Viewer));
        dispatch(explorerActions.setUserRole(userRole));

        const requireConsent = getRequireConsent(customProperties);
        if (requireConsent) {
            dispatch(explorerActions.setRequireConsent(requireConsent));
        }

        if (user && user.features) {
            dispatch(explorerActions.unlockWidgets(defaultLockedWidgets.filter((widget) => user.features[widget])));
        }

        const enabledFeatures = getEnabledFeatures(customProperties) ?? {};
        if (userRole !== UserRole.Viewer) {
            dispatch(
                explorerActions.setEnabledWidgets(
                    enabledFeaturesToFeatureKeys(enabledFeatures).concat(
                        isAdminScene ? allWidgets : defaultEnabledAdminWidgets
                    )
                )
            );
        } else if (enabledFeatures) {
            dispatch(explorerActions.setEnabledWidgets(enabledFeaturesToFeatureKeys(enabledFeatures)));
        }

        const primaryMenu = getPrimaryMenu(customProperties);
        if (primaryMenu) {
            dispatch(explorerActions.setPrimaryMenu(primaryMenu));
        }

        const oAuthState = getOAuthState();

        if (oAuthState) {
            if (oAuthState.service === featuresConfig.bimcollab.key) {
                dispatch(explorerActions.setWidgets([featuresConfig.bimcollab.key]));
            } else if (oAuthState.service === featuresConfig.bimTrack.key) {
                dispatch(explorerActions.setWidgets([featuresConfig.bimTrack.key]));
            } else if (oAuthState.service === featuresConfig.ditio.key) {
                dispatch(explorerActions.setWidgets([featuresConfig.ditio.key]));
            } else if (oAuthState.service === featuresConfig.jira.key) {
                dispatch(explorerActions.setWidgets([featuresConfig.jira.key]));
            }

            if (oAuthState.localBookmarkId) {
                dispatch(explorerActions.setLocalBookmarkId(oAuthState.localBookmarkId));
            }
        } else {
            const searchParams = new URLSearchParams(window.location.search);

            const bookmarkId = searchParams.get("bookmarkId");
            if (bookmarkId) {
                dispatch(explorerActions.setUrlBookmarkId(bookmarkId));
                return;
            }

            const selectionOnly = searchParams.get("selectionOnly") ?? "";
            dispatch(explorerActions.setUrlSearchQuery({ query: getUrlSearchQuery(), selectionOnly }));
        }
    };

    return (
        <>
            <Render3D onInit={handleInit} />
            {view && scene && !disableHud ? <Hud /> : null}
            <Consent />
            <MsalInteraction />
        </>
    );
}

function enabledFeaturesToFeatureKeys(enabledFeatures: Record<string, boolean>): WidgetKey[] {
    const dictionary: Record<string, string | string[] | undefined> = {
        measurement: [featuresConfig.measure.key, featuresConfig.orthoCam.key],
        clipping: [featuresConfig.clippingBox.key, featuresConfig.clippingPlanes.key],
        tree: featuresConfig.modelTree.key,
        layers: [featuresConfig.selectionBasket.key],
    };

    if (enabledFeatures.disableLink === false && enabledFeatures.shareLink !== false) {
        enabledFeatures.shareLink = true;
    }

    return uniqueArray(
        Object.keys(enabledFeatures)
            .map((key) => ({ key, enabled: enabledFeatures[key] }))
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

function getRequireConsent(customProperties: unknown): boolean {
    if (!customProperties || typeof customProperties !== "object") {
        return false;
    }

    if ("requireConsent" in customProperties) {
        return (customProperties as { requireConsent: boolean }).requireConsent;
    } else if ("enabledFeatures" in customProperties) {
        return Boolean(
            (customProperties as { enabledFeatures?: { requireConsent?: boolean } })?.enabledFeatures?.requireConsent
        );
    }

    return false;
}

function getUserRole(customProperties: unknown): UserRole {
    const role =
        customProperties && typeof customProperties === "object" && "role" in customProperties
            ? (customProperties as { role: string }).role
            : UserRole.Viewer;

    return role === "owner" ? UserRole.Owner : role === "administrator" ? UserRole.Admin : UserRole.Viewer;
}

function getPrimaryMenu(customProperties: unknown): PrimaryMenuConfigType | undefined {
    return customProperties && typeof customProperties === "object" && "primaryMenu" in customProperties
        ? (customProperties as { primaryMenu: PrimaryMenuConfigType }).primaryMenu
        : undefined;
}

function ContextProviders({ children }: { children: ReactNode }) {
    return (
        <ExplorerGlobalsProvider>
            <HighlightedProvider>
                <HiddenProvider>
                    <SelectionBasketProvider>
                        <ObjectGroupsProvider>{children}</ObjectGroupsProvider>
                    </SelectionBasketProvider>
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
                (("value" in pattern && Boolean(pattern.value)) || ("range" in pattern && Boolean(pattern.range)))
        );

        if (validPatterns.length) {
            return validPatterns;
        }
    } catch {
        return searchQuery;
    }
}
