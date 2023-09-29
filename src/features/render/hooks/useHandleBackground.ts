import { useEffect } from "react";

import { useAppSelector, useAppDispatch } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { AsyncStatus } from "types/misc";

import { selectBackground, renderActions } from "..";

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
            const envs = await view.availableEnvironments(new URL("https://api.novorender.com/assets/env/index.json"));
            dispatch(renderActions.setBackground({ environments: { status: AsyncStatus.Success, data: envs } }));
        }
    }, [view, dispatch, environments]);

    useEffect(
        function handleBackgroundChange() {
            if (!view) {
                return;
            }

            view.modifyRenderState({ background: { color, url, blur } });
        },
        [view, color, url, blur]
    );
}
