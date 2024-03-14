import { EnvironmentDescription, View } from "@novorender/api";
import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { AsyncStatus } from "types/misc";

import { renderActions, selectBackground } from "..";

export function useHandleBackground() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const { environments, color, url, blur } = useAppSelector(selectBackground);
    const dispatch = useAppDispatch();

    useEffect(() => {
        loadEnvs();

        async function loadEnvs() {
            if (!view || environments.status !== AsyncStatus.Initial) {
                return;
            }

            dispatch(renderActions.setBackground({ environments: { status: AsyncStatus.Loading } }));
            const envs = await View.availableEnvironments(new URL("https://api.novorender.com/assets/env/index.json"));
            dispatch(
                renderActions.setBackground({
                    environments: { status: AsyncStatus.Success, data: envs as EnvironmentDescription[] },
                })
            );
        }
    }, [view, dispatch, environments]);

    useEffect(
        function handleBackgroundChange() {
            if (!view) {
                return;
            }

            view.modifyRenderState({ background: { color: [color[0], color[1], color[2]], url, blur } });
        },
        [view, color, url, blur]
    );
}
