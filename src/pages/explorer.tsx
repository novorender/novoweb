import { SearchPattern } from "@novorender/webgl-api";
import { ReactNode, useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { ExplorerGlobalsProvider, useExplorerGlobals } from "contexts/explorerGlobals";
import { HiddenProvider } from "contexts/hidden";
import { HighlightCollectionsProvider } from "contexts/highlightCollections";
import { HighlightedProvider } from "contexts/highlighted";
import { ObjectGroupsProvider } from "contexts/objectGroups";
import { SelectionBasketProvider } from "contexts/selectionBasket";
import { Consent } from "features/consent";
import { FormsGlobalsProvider } from "features/forms/formsGlobals";
import { Hud } from "features/hud";
import { QuirkAlert } from "features/quirkAlert";
import { Render3D, selectSceneStatus } from "features/render";
import { VersionAlert } from "features/versionAlert";
import { explorerActions } from "slices/explorerSlice";
import { AsyncStatus } from "types/misc";
import { getOAuthState } from "utils/auth";

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
    const sceneStatus = useAppSelector(selectSceneStatus);

    useEffect(() => {
        const oAuthState = getOAuthState();

        if (oAuthState) {
            if (oAuthState.service && oAuthState.service !== "self") {
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
            const closeWidgets = searchParams.get("closeWidgets") ?? "";
            dispatch(
                explorerActions.setUrlSearchQuery({
                    query: getUrlSearchQuery(),
                    options: { selectionOnly, openWidgets: !closeWidgets },
                })
            );
        }
    }, [dispatch]);

    return (
        <>
            <Render3D />
            {sceneStatus.status === AsyncStatus.Success && view && scene && !disableHud ? <Hud /> : null}
            <Consent />
            <VersionAlert />
            <QuirkAlert />
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
                            <FormsGlobalsProvider>
                                <ObjectGroupsProvider>{children}</ObjectGroupsProvider>
                            </FormsGlobalsProvider>
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
