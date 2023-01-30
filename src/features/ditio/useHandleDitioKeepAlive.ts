import { useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { StorageKey } from "config/storage";
import { AsyncStatus } from "types/misc";
import { deleteFromStorage, getFromStorage, saveToStorage } from "utils/storage";

import { useGetAuthConfigQuery, useRefreshTokensMutation } from "./api";
import { ditioActions, selectDitioRefreshToken } from "./slice";

export function useHandleDitioKeepAlive() {
    const dispatch = useAppDispatch();
    const refreshToken = useAppSelector(selectDitioRefreshToken);
    const [refreshTokens] = useRefreshTokensMutation();
    const { data: authConfig } = useGetAuthConfigQuery(undefined, { skip: !refreshToken });

    const timeoutId = useRef<number>();
    useEffect(() => {
        if (!refreshToken || !authConfig) {
            if (timeoutId.current !== undefined) {
                window.clearTimeout(timeoutId.current);
                timeoutId.current = undefined;
            }

            return;
        }

        if (timeoutId.current !== undefined) {
            return;
        }

        timeoutId.current = window.setTimeout(async () => {
            const storedToken = getFromStorage(StorageKey.DitioRefreshToken);
            let refreshTokenExpires: number | undefined = undefined;

            try {
                refreshTokenExpires = JSON.parse(storedToken).expires;
            } catch {
                return;
            }

            const res = await refreshTokens({
                tokenEndpoint: authConfig?.token_endpoint ?? "",
                refreshToken: refreshToken.token,
            });

            if ("data" in res) {
                saveToStorage(
                    StorageKey.DitioRefreshToken,
                    JSON.stringify({ token: res.data.refresh_token, expires: refreshTokenExpires })
                );
                dispatch(ditioActions.setAccessToken({ status: AsyncStatus.Success, data: res.data.access_token }));
                dispatch(
                    ditioActions.setRefreshToken({ token: res.data.refresh_token, refreshIn: res.data.expires_in })
                );
            } else {
                console.warn(res.error);
                deleteFromStorage(StorageKey.DitioRefreshToken);
                dispatch(ditioActions.setRefreshToken(undefined));
                dispatch(ditioActions.setAccessToken({ status: AsyncStatus.Initial }));
            }
        }, refreshToken.refreshIn * 0.9 * 1000);

        return () => {
            window.clearTimeout(timeoutId.current);
            timeoutId.current = undefined;
        };
    }, [refreshToken, dispatch, refreshTokens, authConfig]);

    return;
}
