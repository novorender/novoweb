import { Save } from "@mui/icons-material";
import { Alert, Box, Button, FormControl, InputLabel, MenuItem, Select, Typography, useTheme } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, LinearProgress, ScrollBox } from "components";
import { selectDeviations } from "features/render";
import { selectHasAdminCapabilities, selectProjectIsV2 } from "slices/explorer";
import { AsyncStatus, hasFinished } from "types/misc";

import { ColorStopList } from "../components/colorStop";
import { DeviationsSnackbar } from "../components/deviationsSnackbar";
import { MixFactorInput } from "../components/mixFactorInput";
import {
    deviationsActions,
    selectDeviationCalculationStatus,
    selectDeviationProfileList,
    selectDeviationProfiles,
    selectSaveStatus,
    selectSelectedProfile,
} from "../deviationsSlice";
import { DeviationCalculationStatus } from "../deviationTypes";
import { useSaveDeviationConfig } from "../hooks/useSaveDeviationConfig";

export function Root() {
    const theme = useTheme();
    const isProjectV2 = useAppSelector(selectProjectIsV2);
    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const profiles = useAppSelector(selectDeviationProfiles);
    const profileList = useAppSelector(selectDeviationProfileList);
    const selectedProfile = useAppSelector(selectSelectedProfile);
    const dispatch = useAppDispatch();
    const deviations = useAppSelector(selectDeviations);
    const saveStatus = useAppSelector(selectSaveStatus);
    const isSaving = saveStatus.status === AsyncStatus.Loading;
    const calculationStatus = useAppSelector(selectDeviationCalculationStatus);

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
                        <Box display="flex" justifyContent="space-between">
                            <MixFactorInput />

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
                            <>
                                {calculationStatus.status === DeviationCalculationStatus.Running ? (
                                    <Box p={2} pb={0}>
                                        <Alert severity="info">Deviation calculation is in progress.</Alert>
                                    </Box>
                                ) : profiles.data.rebuildRequired &&
                                  calculationStatus.status !== DeviationCalculationStatus.Initial &&
                                  calculationStatus.status !== DeviationCalculationStatus.Loading ? (
                                    <Box p={2} pb={0}>
                                        <Alert severity="warning">
                                            Deviation configuration changed since the last calculation. Please rerun the
                                            calculation.
                                        </Alert>
                                    </Box>
                                ) : undefined}

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
                            </>
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
