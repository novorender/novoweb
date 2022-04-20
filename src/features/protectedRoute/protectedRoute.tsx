import { ReactNode, useEffect } from "react";
import { useMsal } from "@azure/msal-react";

import { useAppDispatch, useAppSelector } from "app/store";
import { Login } from "pages/login";
import { Loading } from "components";
import { loginRequest } from "config/auth";
import { authActions, selectAccessToken, selectMsalAccount, selectUser } from "slices/authSlice";
import { useMountedState } from "hooks/useMountedState";
import { getStoredActiveAccount } from "utils/auth";
import { dataApi } from "app";

export function Protected({ allowUnauthenticated, children }: { allowUnauthenticated: boolean; children: ReactNode }) {
    const { instance: msalInstance, accounts } = useMsal();

    const accessToken = useAppSelector(selectAccessToken);
    const msalAccount = useAppSelector(selectMsalAccount);
    const user = useAppSelector(selectUser);
    const dispatch = useAppDispatch();

    const [loading, setLoading] = useMountedState(!accessToken);

    useEffect(() => {
        if (loading) {
            getAccessToken();
        }

        async function getAccessToken() {
            await msalInstance.handleRedirectPromise();

            const storedAccount = getStoredActiveAccount();
            const account =
                msalAccount ?? storedAccount
                    ? accounts.find((account) => account.localAccountId === storedAccount?.localAccountId)
                    : accounts[0];

            if (accessToken || !account) {
                return setLoading(false);
            }

            try {
                const response = await msalInstance.acquireTokenSilent({ ...loginRequest, account });
                dispatch(authActions.login({ accessToken: response.accessToken, msalAccount: response.account }));
            } catch (e) {
                console.warn(e);
            }

            setLoading(false);
        }
    }, [user, accounts, dispatch, msalInstance, accessToken, msalAccount, setLoading, loading]);

    useEffect(() => {
        getUser();

        async function getUser() {
            if (accessToken && !user) {
                const user = await dataApi.getUserInformation().catch(() => undefined);
                dispatch(authActions.setUser(user));
            }
        }
    }, [user, accessToken, dispatch]);

    if (loading || (accessToken && !user)) {
        return <Loading />;
    }

    return accessToken || allowUnauthenticated ? <>{children}</> : <Login />;
}
