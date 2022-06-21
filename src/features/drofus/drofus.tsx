import { useCallback, useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";

import { LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";
import { useToggle } from "hooks/useToggle";
import { useAppDispatch, useAppSelector } from "app/store";
import { createOAuthStateString } from "utils/auth";
import { useSceneId } from "hooks/useSceneId";

import { drofusActions, selectAccessToken } from "./drofusSlice";
import { renderActions, selectMainObject } from "slices/renderSlice";
import { getObjectData, searchByPatterns, searchFirstObjectAtPath } from "utils/search";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { deleteFromStorage, saveToStorage } from "utils/storage";
import { StorageKey } from "config/storage";
import { getParentPath, getTotalBoundingSphere } from "utils/objectData";
import { HierarcicalObjectReference } from "@novorender/webgl-api";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";

const appServer = "https://app-db2.drofus.com";
const clientId = "embed/novorender";

export function Drofus() {
    const sceneId = useSceneId();
    const {
        state: { scene, view },
    } = useExplorerGlobals(true);
    const [menuOpen, toggleMenu] = useToggle();
    const [minimized, toggleMinimize] = useToggle(false);
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatch = useAppDispatch();
    const accessToken = useAppSelector(selectAccessToken);
    const mainObject = useAppSelector(selectMainObject);
    const [iframe, setIframe] = useState(null as HTMLIFrameElement | null);
    const [initialized, setInitialized] = useState(false);
    const prevNavigationMsg = useRef<any>(null);

    const handleMessage = useCallback(
        async (msg: any) => {
            if (msg.origin !== appServer) {
                return;
            }

            if (msg.data?.userNavigation) {
                prevNavigationMsg.current = msg.data;
            }

            if (msg.data?.userNavigation !== "occurrenceDetail" || !msg.data.parameters?.occurrenceId) {
                return;
            }

            let res = [] as HierarcicalObjectReference[];
            await searchByPatterns({
                scene,
                searchPatterns: [
                    {
                        property: "FOB_Database_ID/Forekomst_ID",
                        value: String(msg.data.parameters.occurrenceId),
                        exact: true,
                    },
                ],
                callback: (obj) => {
                    res = res.concat(obj);
                },
            });

            if (!res.length) {
                return;
            }

            const bs = getTotalBoundingSphere(res);

            if (bs) {
                view.camera.controller.zoomTo(bs);
            }

            if (res.length === 1) {
                dispatch(renderActions.setMainObject(res[0].id));
            }
            dispatchHighlighted(highlightActions.setIds(res.map((obj) => obj.id)));
        },
        [scene, view, dispatchHighlighted, dispatch]
    );

    useEffect(() => {
        const hashToken = new URLSearchParams(window.location.hash.slice(1)).get("access_token");

        if (!accessToken && hashToken) {
            saveToStorage(StorageKey.DrofusAccessToken, hashToken);
            dispatch(drofusActions.setAccessToken(hashToken));
            window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
    }, [accessToken, dispatch]);

    useEffect(() => {
        init();

        return () => {
            window.removeEventListener("message", handleMessage);
        };
        async function init() {
            if (!accessToken || !iframe || iframe.src) {
                return;
            }

            const res = getLoginMessage();
            iframe.src = `${appServer}/embedded/signin#access_token=${accessToken}`;
            const success = await res;

            if (success) {
                window.addEventListener("message", handleMessage);
                setInitialized(true);
            } else {
                iframe.src = "";
                deleteFromStorage(StorageKey.DrofusAccessToken);
                dispatch(drofusActions.setAccessToken(""));
            }
        }
    }, [accessToken, iframe, handleMessage, dispatch]);

    useEffect(() => {
        handleDrofusLink();

        async function handleDrofusLink() {
            if (!iframe || !initialized || mainObject === undefined) {
                return;
            }

            const obj = await getObjectData({ scene, id: mainObject });

            if (!obj) {
                return;
            }

            const occurrenceIdProp = obj?.properties.find((prop) => prop[0] === "FOB_Database_ID/Forekomst_ID");
            if (
                occurrenceIdProp &&
                prevNavigationMsg.current?.parameters?.occurrenceId &&
                occurrenceIdProp[1] === String(prevNavigationMsg.current.parameters.occurrenceId)
            ) {
                return;
            }

            const roomIdProp = obj.properties.find((prop) => prop[0] === "FOB_Rom_Info/Rom_ID");
            if (roomIdProp) {
                iframe.src = `${appServer}/embedded#/rooms/room/${roomIdProp[1]}/properties`;
                prevNavigationMsg.current = {
                    data: { userNavigation: "roomDetail", parameters: { roomId: roomIdProp[1] } },
                };
                return;
            }

            if (occurrenceIdProp) {
                iframe.src = `${appServer}/embedded#/occurrences/occurrence/${occurrenceIdProp[1]}/properties`;
                prevNavigationMsg.current = {
                    data: { userNavigation: "occurrenceDetail", parameters: { occurrenceId: occurrenceIdProp[1] } },
                };
                return;
            }

            const itemIdProp = obj?.properties.find((prop) => prop[0] === "FOB_Database_ID/Artikkel_ID");
            if (itemIdProp) {
                iframe.src = `${appServer}/embedded#/items/item/${itemIdProp[1]}/properties`;
                prevNavigationMsg.current = {
                    data: { userNavigation: "articleDetail", parameters: { articleId: itemIdProp[1] } },
                };
                return;
            }

            const parentRoomIdProp = obj?.properties.find((prop) => prop[0] === "FOB_Database_ID/Rom_ID");
            if (parentRoomIdProp) {
                iframe.src = `${appServer}/embedded#/rooms/rooms/${parentRoomIdProp[1]}/properties`;
                prevNavigationMsg.current = {
                    data: { userNavigation: "roomDetail", parameters: { roomId: parentRoomIdProp[1] } },
                };
                return;
            }

            const parent = await searchFirstObjectAtPath({ scene, path: getParentPath(obj.path) });
            const parentObjRoomIdProp = parent?.properties.find((prop) => prop[0] === "FOB_Rom_Info/Rom_ID");

            if (parentObjRoomIdProp) {
                iframe.src = `${appServer}/embedded#/rooms/room/${parentObjRoomIdProp[1]}/properties`;
                prevNavigationMsg.current = {
                    data: { userNavigation: "roomDetail", parameters: { roomId: parentObjRoomIdProp[1] } },
                };
                return;
            }

            iframe.src = `${appServer}/embedded#/rooms/search?value= `;
            prevNavigationMsg.current = {
                data: { userNavigation: "roomSearch", parameters: {} },
            };
        }
    }, [initialized, mainObject, scene, iframe]);

    return (
        <>
            <WidgetContainer minimized={minimized}>
                <WidgetHeader
                    minimized={minimized}
                    toggleMinimize={toggleMinimize}
                    widget={featuresConfig.drofus}
                ></WidgetHeader>
                {accessToken ? (
                    <Box
                        display={!menuOpen && !minimized ? "block" : "none"}
                        ref={setIframe}
                        component="iframe"
                        height={1}
                        width={1}
                    />
                ) : (
                    <Box display={!menuOpen && !minimized ? "block" : "none"}>
                        <a href={getLoginUrl(sceneId)}>Logg inn</a>
                    </Box>
                )}
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.drofus.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.drofus.key}-widget-menu-fab`}
            />
        </>
    );
}

function getLoginUrl(sceneId: string): string {
    return (
        "https://ids-db2.drofus.com/connect/authorize" +
        `?client_id=${clientId}` +
        `&redirect_uri=${window.location.origin}/` +
        "&response_type=token" +
        "&scope=dr-std" +
        `&state=${createOAuthStateString({ sceneId, service: featuresConfig.drofus.key })}` +
        "&prompt=login"
    );
}

function getLoginMessage(): Promise<boolean | undefined> {
    return new Promise((resolve) => {
        const onMessage = (message: MessageEvent) => {
            if (message.origin !== appServer) {
                return;
            }

            window.removeEventListener("message", onMessage);
            resolve(message.data?.DrofusEmbedded?.success);
        };

        window.addEventListener("message", onMessage);
    });
}
