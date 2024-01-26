import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useSceneId } from "hooks/useSceneId";
import { initPermissions, selectAccessToken } from "slices/authSlice";

export function useHandleInitPermissions() {
    const sceneId = useSceneId();
    const accessToken = useAppSelector(selectAccessToken);
    const dispatch = useAppDispatch();

    useEffect(() => {
        init();

        async function init() {
            const permissions = await fetch(`https://data-v2.novorender.com/projects/${sceneId}`, {
                headers: { authorization: `Bearer ${accessToken}` },
            })
                .then((r) => r.json())
                .catch(() => ({
                    permissions: [
                        "error:true",
                        "widget:selectionBasket",
                        "widget:properties",
                        "widget:modelTree",
                        "context:clip",
                    ],
                }))
                .then((r) => r.permissions as string[]);

            dispatch(initPermissions({ permissions }));
        }
    }, [sceneId, accessToken, dispatch]);
}
