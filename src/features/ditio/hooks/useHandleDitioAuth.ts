import { useCallback, useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { featuresConfig } from "config/features";
import { useSceneId } from "hooks/useSceneId";
import { selectEnabledWidgets } from "slices/explorer";
import { AsyncStatus } from "types/misc";
import { secondsToMs } from "utils/time";

import { useLazyGetTokenQuery } from "../api";
import { ditioActions, selectDitioAccessToken } from "../slice";

export function useHandleDitioAuth() {
    const sceneId = useSceneId();
    const dispatch = useAppDispatch();
    const enabled = useAppSelector(selectEnabledWidgets).some((widget) => widget.key === featuresConfig.ditio.key);
    const token = useAppSelector(selectDitioAccessToken);
    const [triggerAuthQuery] = useLazyGetTokenQuery();
    const timeoutId = useRef<number>();

    const authenticate = useCallback(async () => {
        const res = await triggerAuthQuery({ sceneId })
            .unwrap()
            .catch(() => {
                console.warn("Ditio machines authentication failed");
                return undefined;
            });

        if (res?.access_token) {
            dispatch(
                ditioActions.setAccessToken({
                    status: AsyncStatus.Success,
                    data: { token: res.access_token, refreshIn: res.expires_in },
                })
            );
        } else {
            dispatch(
                ditioActions.setAccessToken({
                    status: AsyncStatus.Error,
                    msg: "An error occurred while authenticating with Ditio machines API.",
                })
            );
        }
    }, [triggerAuthQuery, dispatch, sceneId]);

    useEffect(() => {
        if (token.status !== AsyncStatus.Initial || !enabled) {
            return;
        }

        dispatch(ditioActions.setAccessToken({ status: AsyncStatus.Loading }));
        authenticate();
    }, [token, dispatch, authenticate, enabled]);

    useEffect(() => {
        if (token.status !== AsyncStatus.Success) {
            return;
        }

        timeoutId.current = window.setInterval(() => {
            authenticate();

            // NOTE(OLA): A bug in Ditio somethimes returns a very high expiry time
        }, (token.data.refreshIn > 3600 * 24 ? token.data.refreshIn : secondsToMs(token.data.refreshIn)) * 0.9);

        return () => {
            clearTimeout(timeoutId.current);
            timeoutId.current = undefined;
        };
    }, [token, authenticate]);
}
