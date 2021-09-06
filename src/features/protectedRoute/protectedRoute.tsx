import { ReactNode, useEffect } from "react";
import { RouteProps, Route } from "react-router-dom";
import { useMsal } from "@azure/msal-react";

import { useAppDispatch, useAppSelector } from "app/store";
import { Login } from "pages/login";
import { Loading } from "components";
import { loginRequest } from "config/auth";
import { authActions, selectAccessToken, selectMsalAccount } from "slices/authSlice";
import { useMountedState } from "hooks/useMountedState";

export function ProtectedRoute({ children, ...props }: RouteProps) {
    return (
        <Route {...props}>
            <Protected>{children}</Protected>
        </Route>
    );
}

export function Protected({ children }: { children: ReactNode }) {
    const { instance: msalInstance, accounts } = useMsal();

    const accessToken = useAppSelector(selectAccessToken);
    const msalAccount = useAppSelector(selectMsalAccount);
    const dispatch = useAppDispatch();

    const [loading, setLoading] = useMountedState(!accessToken);

    useEffect(() => {
        if (loading) {
            getAccessToken();
        }

        async function getAccessToken() {
            await msalInstance.handleRedirectPromise();

            const account = msalAccount ?? accounts[0];

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
    }, [accounts, dispatch, msalInstance, accessToken, msalAccount, setLoading, loading]);

    if (loading) {
        return <Loading />;
    }

    return accessToken ? <>{children}</> : <Login />;
}
