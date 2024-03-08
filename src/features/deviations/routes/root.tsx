import { Add, Delete, InfoOutlined, Save, Settings } from "@mui/icons-material";
import {
    Box,
    Button,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Tooltip,
    Typography,
    useTheme,
} from "@mui/material";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { Divider, LinearProgress, ScrollBox } from "components";
import { selectDeviations } from "features/render";
import { selectHasAdminCapabilities, selectProjectIsV2 } from "slices/explorerSlice";
import { AsyncStatus, hasFinished } from "types/misc";

import { ColorStopList } from "../components/colorStop";
import { DeviationsSnackbar } from "../components/deviationsSnackbar";
import { MixFactorInput } from "../components/mixFactorInput";
import {
    deviationsActions,
    selectDeviationProfileList,
    selectDeviationProfiles,
    selectSaveStatus,
    selectSelectedProfile,
} from "../deviationsSlice";
import { useSaveDeviationConfig } from "../hooks/useSaveDeviationConfig";
import { MAX_DEVIATION_PROFILE_COUNT, newDeviationForm, profileToDeviationForm } from "../utils";

export function Root() {
    const history = useHistory();
    const theme = useTheme();
    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const isProjectV2 = useAppSelector(selectProjectIsV2);
    const profiles = useAppSelector(selectDeviationProfiles);
    const profileList = useAppSelector(selectDeviationProfileList);
    const selectedProfile = useAppSelector(selectSelectedProfile);
    const dispatch = useAppDispatch();
    const deviations = useAppSelector(selectDeviations);
    const saveStatus = useAppSelector(selectSaveStatus);
    const isSaving = saveStatus.status === AsyncStatus.Loading;
    const saveConfig = useSaveDeviationConfig();

    const handleSave = async () => {
        if (profiles.status !== AsyncStatus.Success) {
            return;
        }

        await saveConfig({ uiConfig: profiles.data, deviations });
    };

    return (
        <>
            <DeviationsSnackbar />

            {!hasFinished(profiles) ? (
                <>
                    <Box
                        boxShadow={theme.customShadows.widgetHeader}
                        sx={{ height: 5, width: 1, mt: "-5px" }}
                        position="absolute"
                    />
                    <Box position="relative">
                        <LinearProgress />
                    </Box>
                </>
            ) : (
                <>
                    <Box boxShadow={theme.customShadows.widgetHeader}>
                        <Box px={1}>
                            <Divider />
                        </Box>
                        <Box display={"flex"} justifyContent={"flex-end"}>
                            <MixFactorInput />

                            <Box flex="auto" />

                            {!isProjectV2 && (
                                <Tooltip
                                    title={
                                        <>
                                            <div>
                                                Deviations widget for older projects supports limited functionality:
                                            </div>
                                            <ul>
                                                <li>Same color stops for all deviation profiles</li>
                                                <li>Deviation profiles are read only</li>
                                            </ul>
                                        </>
                                    }
                                    enterDelay={0}
                                >
                                    <IconButton
                                        onClick={(evt) => {
                                            evt.stopPropagation();
                                        }}
                                    >
                                        <InfoOutlined />
                                    </IconButton>
                                </Tooltip>
                            )}

                            <Button
                                color="grey"
                                onClick={() => {
                                    const deviationForm = profileToDeviationForm(selectedProfile!);
                                    dispatch(deviationsActions.setDeviationForm(deviationForm));
                                    history.push("/deviation/edit");
                                }}
                                disabled={!selectedProfile}
                            >
                                <Settings fontSize="small" sx={{ mr: 1 }} />
                                Settings
                            </Button>
                            {isProjectV2 && (
                                <Button
                                    color="grey"
                                    onClick={() => {
                                        history.push("/deviation/delete", { id: selectedProfile!.id! });
                                    }}
                                    disabled={!selectedProfile}
                                >
                                    <Delete fontSize="small" sx={{ mr: 1 }} />
                                    Remove
                                </Button>
                            )}
                            {isProjectV2 && (
                                <Tooltip
                                    title={
                                        profileList.length === MAX_DEVIATION_PROFILE_COUNT
                                            ? "Reached maximum supported amount of deviation profiles"
                                            : ""
                                    }
                                >
                                    <span>
                                        <Button
                                            color="grey"
                                            onClick={() => {
                                                dispatch(deviationsActions.setDeviationForm(newDeviationForm()));
                                                history.push("/deviation/add");
                                            }}
                                            disabled={profileList.length === MAX_DEVIATION_PROFILE_COUNT}
                                        >
                                            <Add fontSize="small" sx={{ mr: 1 }} />
                                            New
                                        </Button>
                                    </span>
                                </Tooltip>
                            )}
                            {isAdmin && (
                                <Button
                                    color="grey"
                                    onClick={handleSave}
                                    disabled={isSaving || profileList.length === 0}
                                >
                                    <Save fontSize="small" sx={{ mr: 1 }} />
                                    Save
                                </Button>
                            )}
                        </Box>
                    </Box>

                    {isSaving && (
                        <Box position="relative">
                            <LinearProgress />
                        </Box>
                    )}

                    <ScrollBox>
                        {profiles.status === AsyncStatus.Error ? (
                            <Typography>{profiles.msg}</Typography>
                        ) : (
                            <Box p={2}>
                                <FormControl fullWidth>
                                    <InputLabel id="select-profile-label">Select deviation profile</InputLabel>
                                    <Select
                                        labelId="select-profile-label"
                                        id="select-profile"
                                        value={selectedProfile?.id ?? ""}
                                        label="Select deviation profile"
                                        onChange={(e) => {
                                            dispatch(deviationsActions.setSelectedProfileId(e.target.value));
                                        }}
                                    >
                                        {profileList.map((profile) => (
                                            <MenuItem key={profile.id} value={profile.id}>
                                                {profile.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Box>
                        )}

                        {selectedProfile && (
                            <Box px={2}>
                                <ColorStopList
                                    colorStops={selectedProfile.colors!.colorStops}
                                    onChange={(colorStops) => {
                                        dispatch(
                                            deviationsActions.setProfile({
                                                id: selectedProfile!.id,
                                                profile: {
                                                    ...selectedProfile,
                                                    colors: { ...selectedProfile.colors!, colorStops },
                                                },
                                                setColorsForAll: !isProjectV2,
                                            })
                                        );
                                    }}
                                />
                            </Box>
                        )}
                    </ScrollBox>
                </>
            )}
        </>
    );
}
