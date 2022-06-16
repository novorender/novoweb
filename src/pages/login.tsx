import { useState, FormEvent, ChangeEvent } from "react";
import { useMsal } from "@azure/msal-react";
import { useTheme, Box, OutlinedInput, IconButton, InputAdornment, FormControl, CircularProgress } from "@mui/material";
import { useHistory } from "react-router-dom";

import { loginRequest } from "config/auth";
import { useAppDispatch } from "app/store";
import { authActions } from "slices/authSlice";
import { login } from "utils/auth";
import { useToggle } from "hooks/useToggle";

import { Lock, Visibility, VisibilityOff, AccountCircle } from "@mui/icons-material";
import { ReactComponent as NovorenderLogo } from "media/img/novorender_logo_RGB_2021.svg";
import { deleteFromStorage, saveToStorage } from "utils/storage";
import { StorageKey } from "config/storage";
import { useSceneId } from "hooks/useSceneId";
import { dataServerBaseUrl } from "config";
import { LoadingButton } from "@mui/lab";

export function Login() {
    const theme = useTheme();
    const sceneId = useSceneId();
    const history = useHistory();
    const { instance } = useMsal();
    const dispatch = useAppDispatch();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [showPassword, toggleShowPassword] = useToggle(false);
    const [loadingLogin, setLoadingLogin] = useState(false);
    const [loadingTenant, setLoadingTenant] = useState(false);

    const handleAdRedirect = async () => {
        setLoadingTenant(true);
        deleteFromStorage(StorageKey.NovoToken);
        const tenant = await fetch(`${dataServerBaseUrl}/scenes/${sceneId}`)
            .then((res) => res.json())
            .then((res) => ("tenant" in res ? res.tenant : undefined))
            .catch((_err) => undefined);

        instance
            .loginRedirect({
                ...loginRequest,
                authority: tenant ? `https://login.microsoftonline.com/${tenant}` : loginRequest.authority,
                redirectStartPage: window.location.href.replace("/login", ""),
                prompt: "select_account",
            })
            .catch((e) => {
                console.warn(e);
                setLoadingTenant(false);
            });
    };

    const handleChange = (setState: (val: string) => void) => (e: ChangeEvent<HTMLInputElement>) => {
        setError("");
        setState(e.target.value);
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        deleteFromStorage(StorageKey.NovoToken);
        deleteFromStorage(StorageKey.MsalActiveAccount);

        if (!username || !password) {
            return;
        }

        setLoadingLogin(true);
        const res = await login(username, password).catch((err) => {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An error ocurred.");
            }
        });

        if (res) {
            saveToStorage(
                StorageKey.NovoToken,
                JSON.stringify({ token: res.token, expiry: Date.now() + 1000 * 60 * 60 * 24 })
            );
            dispatch(authActions.login({ accessToken: res.token, user: res.user }));
            history.replace(history.location.pathname.replace("login/", "") + window.location.search);
        }

        setLoadingLogin(false);
    };

    return (
        <Box height={"100vh"} bgcolor={{ xs: theme.palette.common.white, sm: theme.palette.grey[200] }}>
            <Box p={3} textAlign={{ xs: "center", sm: "left" }}>
                <NovorenderLogo title="novorender" height={35} fill={theme.palette.primary.main} />
            </Box>

            <Box
                p={2}
                maxWidth={430}
                maxHeight={{ xs: "auto", sm: 512 }}
                width={1}
                height={1}
                borderRadius="4px"
                bgcolor={theme.palette.common.white}
                py={{ xs: 2, sm: 8.5 }}
                px={{ xs: 2, sm: 8 }}
                mx="auto"
                mt={{ xs: 0, sm: 13 }}
            >
                <Box mb={2} fontSize={24} fontWeight={700} textAlign="center" component="h1">
                    Log in
                </Box>
                <form onSubmit={handleSubmit}>
                    <Box mb={2}>
                        <FormControl fullWidth>
                            <label htmlFor="username">Username</label>
                            <OutlinedInput
                                id="username"
                                required
                                value={username}
                                onChange={handleChange(setUsername)}
                                type="text"
                                startAdornment={
                                    <InputAdornment position="start">
                                        <AccountCircle htmlColor={theme.palette.grey[600]} />
                                    </InputAdornment>
                                }
                            />
                        </FormControl>
                    </Box>
                    <Box mb={1.5} pb={4} position="relative">
                        <FormControl fullWidth>
                            <label htmlFor="password">Password</label>
                            <OutlinedInput
                                id="password"
                                required
                                value={password}
                                onChange={handleChange(setPassword)}
                                type={showPassword ? "text" : "password"}
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
                        <Box color={"red"} position="absolute" bottom={0}>
                            {error}
                        </Box>
                    </Box>
                    <Box mb={2}>
                        <LoadingButton
                            type="submit"
                            fullWidth
                            variant="contained"
                            color="primary"
                            size="large"
                            loading={loadingLogin}
                            loadingIndicator={
                                <Box display="flex" alignItems="center">
                                    Log in <CircularProgress sx={{ ml: 1 }} color="inherit" size={16} />
                                </Box>
                            }
                        >
                            Log in
                        </LoadingButton>
                    </Box>
                    <LoadingButton
                        type="button"
                        fullWidth
                        variant="outlined"
                        color="secondary"
                        size="large"
                        onClick={handleAdRedirect}
                        loading={loadingTenant}
                        loadingIndicator={
                            <Box display="flex" alignItems="center">
                                Active Directory <CircularProgress sx={{ ml: 1 }} color="inherit" size={16} />
                            </Box>
                        }
                    >
                        Active Directory
                    </LoadingButton>
                </form>
            </Box>
        </Box>
    );
}
