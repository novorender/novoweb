import { ReactNode, useEffect } from "react";
import { useMsal } from "@azure/msal-react";

import { useAppDispatch, useAppSelector } from "app/store";
import { Login } from "pages/login";
import { Loading } from "components";
import { loginRequest } from "config/auth";
import { authActions, selectAccessToken, selectAdTentant, selectMsalAccount } from "slices/authSlice";
import { useMountedState } from "hooks/useMountedState";
import { getAccessToken, getStoredActiveAccount, getUser } from "utils/auth";

enum Status {
    Initial,
    Loading,
    Ready,
}

export function Protected({ allowUnauthenticated, children }: { allowUnauthenticated: boolean; children: ReactNode }) {
    const { instance: msalInstance, accounts } = useMsal();

    const accessToken = useAppSelector(selectAccessToken);
    const adTenant = useAppSelector(selectAdTentant);
    const msalAccount = useAppSelector(selectMsalAccount);
    const dispatch = useAppDispatch();

    const [status, setStatus] = useMountedState(!accessToken ? Status.Initial : Status.Ready);

    useEffect(() => {
        if (status === Status.Initial) {
            verifyAadLogin();
        }

        async function verifyAadLogin() {
            setStatus(Status.Loading);
            await msalInstance.handleRedirectPromise();

            const storedAccount = getStoredActiveAccount();
            const account =
                msalAccount ?? storedAccount
                    ? accounts.find((account) => account.localAccountId === storedAccount?.localAccountId)
                    : accounts[0];

            if (!account) {
                return setStatus(Status.Ready);
            }

            try {
                const response = await msalInstance.ssoSilent({
                    ...loginRequest,
                    authority: adTenant ? `https://login.microsoftonline.com/${adTenant}` : loginRequest.authority,
                    account,
                });
                const accessToken = await getAccessToken(response.accessToken);

                if (!accessToken) {
                    throw new Error("Failed to get access token");
                }

                const user = await getUser(accessToken);

                if (!user) {
                    throw new Error("Failed to get user");
                }

                dispatch(authActions.login({ accessToken: response.accessToken, msalAccount: response.account, user }));
            } catch (e) {
                console.warn(e);
            }

            setStatus(Status.Ready);
        }
    }, [accounts, dispatch, msalInstance, accessToken, msalAccount, status, setStatus, adTenant]);

    if (status !== Status.Ready) {
        return <Loading />;
    }

    return accessToken || allowUnauthenticated ? <>{children}</> : <Login />;
}
