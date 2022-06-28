import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { Box, CircularProgress, FormControl, IconButton, InputAdornment, OutlinedInput } from "@mui/material";
import { VisibilityOff, Visibility, AccountCircle, Lock } from "@mui/icons-material";

import { useAppDispatch, useAppSelector } from "app/store";
import { LinearProgress } from "components";
import { useToggle } from "hooks/useToggle";
import { theme } from "app/theme";
import { LoadingButton } from "@mui/lab";
import { leicaActions, LeicaStatus, selectCsrfToken, selectSessionId, selectStatus } from "../leicaSlice";
import { saveToStorage } from "utils/storage";
import { StorageKey } from "config/storage";

export function Login() {
    const history = useHistory();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, toggleShowPassword] = useToggle(false);

    const csrfToken = useAppSelector(selectCsrfToken);
    const sessionId = useAppSelector(selectSessionId);
    const status = useAppSelector(selectStatus);
    const dispatch = useAppDispatch();

    useEffect(() => {
        init();

        async function init() {
            if (status !== LeicaStatus.Initial) {
                return;
            }

            dispatch(leicaActions.setStatus(LeicaStatus.LoadingCsrfToken));

            try {
                const res = await fetch("leica/login", {
                    headers: {
                        "x-cookie": `csrftoken=${csrfToken}; login_remember_me=true; sessionid=${sessionId}; `,
                    },
                });

                if (sessionId && csrfToken) {
                    const success = res.headers.get("x-success");

                    if (success) {
                        history.replace("/equipment");
                        return;
                    }
                }

                const token = res.headers.get("x-csrftoken") ?? "";
                saveToStorage(StorageKey.LeicaCsrfToken, token);
                dispatch(leicaActions.setCsrfToken(token));
                dispatch(leicaActions.setSessionId(""));
                dispatch(leicaActions.setStatus(LeicaStatus.Unauthenticated));
            } catch (e) {
                console.warn(e);
                dispatch(leicaActions.setCsrfToken(""));
                dispatch(leicaActions.setSessionId(""));
                dispatch(leicaActions.setStatus(LeicaStatus.Error));
            }
        }
    }, [history, sessionId, csrfToken, dispatch, status]);

    const handleChange = (setState: (val: string) => void) => (e: ChangeEvent<HTMLInputElement>) => {
        setState(e.target.value);
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!username || !password) {
            return;
        }

        dispatch(leicaActions.setStatus(LeicaStatus.LoadingLogin));

        try {
            const res = await fetch("/leica/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "x-cookie": `csrftoken=${csrfToken}`,
                },
                body: `username=${username}&password=${password}&rembember_me=true&csrfmiddlewaretoken=${csrfToken}`,
            });

            const _sessionId = res.headers.get("x-sessionid") ?? "";

            if (_sessionId) {
                saveToStorage(StorageKey.LeicaSessionId, _sessionId);
                dispatch(leicaActions.setSessionId(_sessionId));
                dispatch(leicaActions.setStatus(LeicaStatus.Authenticated));
                history.replace("/equipment");
            } else {
                dispatch(leicaActions.setError("Login failed."));
            }
        } catch (e) {
            console.warn(e);
            dispatch(leicaActions.setError("Login failed."));
        }
    };

    return [LeicaStatus.LoadingCsrfToken, LeicaStatus.Initial].includes(status) ? (
        <LinearProgress sx={{ ml: -1, mt: -1 }} />
    ) : (
        <Box component="form" onSubmit={handleSubmit}>
            <FormControl fullWidth>
                <label htmlFor="username">Username</label>
                <OutlinedInput
                    id="username"
                    required
                    value={username}
                    onChange={handleChange(setUsername)}
                    type="text"
                    size="small"
                    autoFocus
                    startAdornment={
                        <InputAdornment position="start">
                            <AccountCircle htmlColor={theme.palette.grey[600]} />
                        </InputAdornment>
                    }
                />
            </FormControl>

            <FormControl fullWidth>
                <label htmlFor="password">Password</label>
                <OutlinedInput
                    id="password"
                    required
                    value={password}
                    onChange={handleChange(setPassword)}
                    type={showPassword ? "text" : "password"}
                    size="small"
                    startAdornment={
                        <InputAdornment position="start">
                            <Lock htmlColor={theme.palette.grey[600]} />
                        </InputAdornment>
                    }
                    endAdornment={
                        <InputAdornment position="end">
                            <IconButton
                                aria-label="toggle password visibility"
                                onClick={toggleShowPassword}
                                size="large"
                            >
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                        </InputAdornment>
                    }
                />
            </FormControl>
            <Box mt={2}>
                <LoadingButton
                    type="submit"
                    fullWidth
                    variant="contained"
                    color="primary"
                    size="large"
                    loading={status === LeicaStatus.LoadingLogin}
                    loadingIndicator={
                        <Box display="flex" alignItems="center">
                            Logging in <CircularProgress sx={{ ml: 1 }} color="inherit" size={16} />
                        </Box>
                    }
                >
                    Log in to Leica ConX
                </LoadingButton>
            </Box>
        </Box>
    );
}
