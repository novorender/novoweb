import { ReactNode, useEffect } from "react";
import { SearchPattern } from "@novorender/webgl-api";

import { getOAuthState } from "utils/auth";
import { Hud } from "features/hud";
import { Render3D } from "features/render";
import { Consent } from "features/consent";
import { useAppDispatch } from "app/store";
import { explorerActions } from "slices/explorerSlice";
import { HiddenProvider } from "contexts/hidden";
import { ObjectGroupsProvider } from "contexts/objectGroups";
import { HighlightedProvider } from "contexts/highlighted";
import { SelectionBasketProvider } from "contexts/selectionBasket";
import { ExplorerGlobalsProvider, useExplorerGlobals } from "contexts/explorerGlobals";
import { HighlightCollectionsProvider } from "contexts/highlightCollections";
import { MsalInteraction } from "features/msalInteraction";
import { VersionAlert } from "features/versionAlert";

export function Explorer() {
    return (
        <ContextProviders>
            <ExplorerBase />
        </ContextProviders>
    );
}

const disableHud = new URLSearchParams(window.location.search).get("disableHud") === "true";

function ExplorerBase() {
    const dispatch = useAppDispatch();
    const {
        state: { view, scene },
    } = useExplorerGlobals();

    useEffect(() => {
        const oAuthState = getOAuthState();

        if (oAuthState) {
            if (oAuthState.service) {
                dispatch(explorerActions.setWidgets([oAuthState.service]));
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
    }, [dispatch]);

    return (
        <>
            <Render3D />
            {view && scene && !disableHud ? <Hud /> : null}
            <Consent />
            <VersionAlert />
            <MsalInteraction />
        </>
    );
}

function ContextProviders({ children }: { children: ReactNode }) {
    return (
        <ExplorerGlobalsProvider>
            <HighlightedProvider>
                <HighlightCollectionsProvider>
                    <HiddenProvider>
                        <SelectionBasketProvider>
                            <ObjectGroupsProvider>{children}</ObjectGroupsProvider>
                        </SelectionBasketProvider>
                    </HiddenProvider>
                </HighlightCollectionsProvider>
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
