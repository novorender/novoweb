import { useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { StorageKey } from "config/storage";
import { AsyncStatus } from "types/misc";
import { deleteFromStorage } from "utils/storage";

import { useRefreshTokensMutation } from "./api";
import { xsiteManageActions, selectXsiteManageRefreshToken } from "./slice";

export function useHandleXsiteManageKeepAlive() {
    const dispatch = useAppDispatch();
    const refreshToken = useAppSelector(selectXsiteManageRefreshToken);
    const [refreshTokens] = useRefreshTokensMutation();
    const timeoutId = useRef<number>();

    useEffect(() => {
        if (!refreshToken) {
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
            const res = await refreshTokens({ refreshToken: refreshToken.token });

            if ("data" in res) {
                dispatch(xsiteManageActions.setAccessToken({ status: AsyncStatus.Success, data: res.data.id_token }));
            } else {
                console.warn(res.error);
                deleteFromStorage(StorageKey.XsiteManageRefreshToken);
                dispatch(xsiteManageActions.setRefreshToken(undefined));
                dispatch(xsiteManageActions.setAccessToken({ status: AsyncStatus.Initial }));
            }
        }, refreshToken.refreshIn * 0.9 * 1000);

        return () => {
            window.clearTimeout(timeoutId.current);
            timeoutId.current = undefined;
        };
    }, [refreshToken, dispatch, refreshTokens]);

    return;
}
