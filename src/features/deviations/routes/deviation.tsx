import { InfoOutlined } from "@mui/icons-material";
import {
    Autocomplete,
    Box,
    Button,
    Checkbox,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    MenuItem,
    Radio,
    RadioGroup,
    Select,
    SxProps,
    TextField,
    Theme,
    Tooltip,
    Typography,
    useTheme,
} from "@mui/material";
import { View } from "@novorender/api";
import { ObjectDB } from "@novorender/data-js-api";
import { CenterLine } from "apis/dataV2/deviationTypes";
import { useCallback, useMemo } from "react";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { Divider, LinearProgress, ScrollBox } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { isInternalGroup, ObjectGroup, useObjectGroups } from "contexts/objectGroups";
import { areArraysEqual } from "features/arcgis/utils";
import { selectDeviations } from "features/render";
import { selectProjectIsV2 } from "slices/explorerSlice";
import { AsyncStatus } from "types/misc";
import { getObjectData } from "utils/search";

import { CenterLineSection } from "../components/centerLineSection";
import { ColorStopList } from "../components/colorStop";
import { SectionHeader } from "../components/sectionHeader";
import { TunnelInfoSection } from "../components/tunnelInfoSection";
import {
    deviationsActions,
    selectDeviationForm,
    selectDeviationProfileList,
    selectDeviationProfiles,
    selectSaveStatus,
} from "../deviationsSlice";
import {
    CenterLineGroup,
    DeviationForm,
    DeviationType,
    TunnelInfoGroup,
    UiDeviationConfig,
    UiDeviationProfile,
} from "../deviationTypes";
import { useSaveDeviationConfig } from "../hooks/useSaveDeviationConfig";
import { NEW_DEVIATION_ID, newDeviationForm, profileToDeviationForm } from "../utils";
import {
    getActiveErrorText,
    hasActiveErrors,
    hasErrors,
    isActiveError,
    touchFormField,
    updateFormField,
    validateDeviationForm,
} from "../validation";

export function Deviation() {
    const {
        state: { view, db },
    } = useExplorerGlobals();
    const isProjectV2 = useAppSelector(selectProjectIsV2);
    const theme = useTheme();
    const history = useHistory();
    const profiles = useAppSelector(selectDeviationProfiles);
    const profileList = useAppSelector(selectDeviationProfileList);
    const dispatch = useAppDispatch();
    const saveStatus = useAppSelector(selectSaveStatus);
    const objectGroups = useObjectGroups().filter((grp) => !isInternalGroup(grp));
    const saveConfig = useSaveDeviationConfig();
    const deviations = useAppSelector(selectDeviations);

    const deviationForm = useAppSelector(selectDeviationForm) ?? newDeviationForm();

    const update = useCallback(
        (upd: Partial<DeviationForm>) => {
            dispatch(deviationsActions.setDeviationForm({ ...deviationForm, ...upd }));
        },
        [dispatch, deviationForm]
    );
    const updateCenterLine = useCallback((centerLine: CenterLineGroup) => update({ centerLine }), [update]);
    const updateTunnelInfo = useCallback((tunnelInfo: TunnelInfoGroup) => update({ tunnelInfo }), [update]);

    const otherNames = useMemo(
        () => profileList.filter((p) => p.id !== deviationForm.id).map((p) => p.name.toLowerCase()),
        [profileList, deviationForm.id]
    );
    const errors = validateDeviationForm(deviationForm, otherNames);

    const formDisabled = !isProjectV2;

    const groups1 = useMemo(
        () =>
            deviationForm.groups1.value
                .map((id) => objectGroups.find((g) => g.id === id))
                .filter((e) => e) as ObjectGroup[],
        [deviationForm.groups1.value, objectGroups]
    );
    const groups2 = useMemo(
        () =>
            deviationForm.groups2.value
                .map((id) => objectGroups.find((g) => g.id === id))
                .filter((e) => e) as ObjectGroup[],
        [deviationForm.groups2.value, objectGroups]
    );
    const deviationFavorites = useMemo(
        () =>
            (deviationForm.favorites.value || [])
                .map((id) => objectGroups.find((g) => g.id === id))
                .filter((e) => e) as ObjectGroup[],
        [deviationForm.favorites.value, objectGroups]
    );

    const groups1Options = useMemo(() => objectGroups.filter((g) => !groups2.includes(g)), [objectGroups, groups2]);
    const groups2Options = useMemo(() => objectGroups.filter((g) => !groups1.includes(g)), [objectGroups, groups1]);
    const favoriteOptions = objectGroups;

    const handleSave = () => {
        save();

        async function save() {
            if (profiles.status !== AsyncStatus.Success || !db || !view) {
                return;
            }

            if (hasErrors(errors)) {
                update({
                    name: touchFormField(deviationForm.name),
                    groups1: touchFormField(deviationForm.groups1),
                    groups2: touchFormField(deviationForm.groups2),
                    colorSetup: {
                        ...deviationForm.colorSetup,
                        colorStops: touchFormField(deviationForm.colorSetup.colorStops),
                    },
                });
                return;
            }

            dispatch(deviationsActions.setSaveStatus({ status: AsyncStatus.Loading }));
            try {
                const profile = await deviationFormToProfile({
                    db,
                    view,
                    deviationForm: deviationForm,
                    objectGroups,
                });
                const isNew = deviationForm.id === NEW_DEVIATION_ID;
                if (isNew) {
                    profile.id = window.crypto.randomUUID();
                }
                const newProfileData = mergeDeviationFormIntoProfiles(profiles.data, profile);

                await saveConfig({
                    uiConfig: newProfileData,
                    deviations: {
                        ...deviations,
                        colorGradient: {
                            knots: profile.colors.colorStops,
                        },
                    },
                    showRebuildMessage: newProfileData.rebuildRequired,
                });

                dispatch(deviationsActions.setProfiles({ status: AsyncStatus.Success, data: newProfileData }));

                history.goBack();

                dispatch(deviationsActions.setDeviationForm(undefined));
            } catch (ex) {
                console.warn(ex);
                dispatch(
                    deviationsActions.setSaveStatus({
                        status: AsyncStatus.Error,
                        msg: "Failed to save deviation profile",
                    })
                );
            }
        }
    };

    const loading = saveStatus.status === AsyncStatus.Loading;

    const canSave = saveStatus.status !== AsyncStatus.Loading && !hasActiveErrors(errors);

    return (
        <>
            <Box
                boxShadow={theme.customShadows.widgetHeader}
                sx={{ height: 5, width: 1, mt: "-5px" }}
                position="absolute"
            />

            {loading ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : null}
            <ScrollBox height={1} p={2}>
                <Typography fontWeight={600} fontSize="1.5rem" mb={2}>
                    Create deviation profile
                </Typography>
                <FormControl fullWidth>
                    <InputLabel id="select-profile-to-copy-from-label">
                        Copy from existing profile (optional)
                    </InputLabel>
                    <Select
                        labelId="select-profile-to-copy-from-label"
                        id="select-profile-to-copy-from"
                        value={deviationForm.copyFromProfileId.value ?? ""}
                        label="Copy from existing profile (optional)"
                        onChange={(e) => {
                            const source = profileList.find((p) => p.id === e.target.value)!;
                            const newProfile = copyProfile(profileList, source);
                            update(newProfile);
                        }}
                        disabled={formDisabled}
                    >
                        {profileList.map((profile, idx) => (
                            <MenuItem key={profile.id} value={profile.id}>
                                {profile.name ?? `Deviation ${idx + 1}`}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <TextField
                    fullWidth
                    value={deviationForm.name.value}
                    onChange={(e) => {
                        update({ name: updateFormField(e.target.value) });
                    }}
                    label="Name of the deviation profile"
                    error={isActiveError(errors.name)}
                    helperText={getActiveErrorText(errors.name)}
                    sx={{ mt: 2 }}
                    disabled={formDisabled}
                />
                <SectionHeader>Select deviation Groups</SectionHeader>
                <Typography>
                    Create deviations between items in Groups. For example a point cloud and (many) 3D asset(s).
                </Typography>
                <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                    <FormControl>
                        <RadioGroup
                            row
                            aria-labelledby="select-deviation-type-label"
                            name="select-deviation-type"
                            value={deviationForm.deviationType.value}
                            onChange={(e) => {
                                update({
                                    deviationType: updateFormField(Number(e.target.value)),
                                    groups1: {
                                        value: deviationForm.groups1.value.filter(
                                            (id) => !deviationForm.groups2.value.includes(id)
                                        ),
                                        edited: deviationForm.groups1.edited,
                                    },
                                });
                            }}
                        >
                            <FormControlLabel
                                value={DeviationType.PointToTriangle}
                                control={<Radio />}
                                label="Mesh"
                                disabled={formDisabled}
                            />
                            <FormControlLabel
                                value={DeviationType.PointToPoint}
                                control={<Radio />}
                                label="Point"
                                disabled={formDisabled}
                            />
                        </RadioGroup>
                    </FormControl>
                    {!deviationForm.hasFromAndTo && (
                        <Tooltip
                            title="Deviation profile was created in the older version, where only one set of groups needed to be specified."
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
                </Box>
                <GroupAutocomplete
                    options={groups1Options}
                    label="Groups to analyse"
                    onChange={(groups) => {
                        update({ groups1: updateFormField(groups.map((g) => g.id)) });
                    }}
                    selected={groups1}
                    sx={{ mt: 2 }}
                    error={isActiveError(errors.groups1)}
                    helperText={getActiveErrorText(errors.groups1)}
                    disabled={formDisabled}
                />
                <Box display="flex" justifyContent="center" mt={1}>
                    <Typography fontWeight={600}>vs</Typography>
                </Box>
                <GroupAutocomplete
                    options={groups2Options}
                    label="Analyse against"
                    onChange={(groups) => update({ groups2: updateFormField(groups.map((g) => g.id)) })}
                    selected={groups2}
                    sx={{ mt: 1 }}
                    error={isActiveError(errors.groups2)}
                    helperText={getActiveErrorText(errors.groups2)}
                    disabled={formDisabled}
                />
                <SectionHeader>Select deviation favourites</SectionHeader>
                <GroupAutocomplete
                    options={favoriteOptions}
                    label="Groups"
                    onChange={(groups) => update({ favorites: updateFormField(groups.map((g) => g.id)) })}
                    selected={deviationFavorites}
                    sx={{ mt: 2 }}
                    disabled={formDisabled}
                />
                <SectionHeader>Deviation parameters</SectionHeader>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={deviationForm.colorSetup.absoluteValues}
                            onChange={(e) =>
                                update({
                                    colorSetup: { ...deviationForm.colorSetup, absoluteValues: e.target.checked },
                                })
                            }
                            disabled={formDisabled}
                        />
                    }
                    label="Absolute values"
                />
                <ColorStopList
                    colorStops={deviationForm.colorSetup.colorStops.value}
                    onChange={(colorStops) =>
                        update({ colorSetup: { ...deviationForm.colorSetup, colorStops: updateFormField(colorStops) } })
                    }
                    errors={errors}
                    disabled={formDisabled}
                />
                <CenterLineSection
                    centerLine={deviationForm.centerLine}
                    onChange={updateCenterLine}
                    disabled={formDisabled}
                />
                {deviationForm.centerLine.enabled && (
                    <TunnelInfoSection
                        tunnelInfo={deviationForm.tunnelInfo}
                        onChange={updateTunnelInfo}
                        disabled={formDisabled}
                        errors={errors}
                    />
                )}
                <Box mt={4}>
                    <Divider />
                </Box>

                <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
                    {formDisabled ? (
                        <Button
                            color="grey"
                            onClick={() => {
                                history.goBack();
                                dispatch(deviationsActions.setDeviationForm(undefined));
                            }}
                        >
                            Back
                        </Button>
                    ) : (
                        <>
                            <Button
                                color="grey"
                                onClick={() => {
                                    history.goBack();
                                    dispatch(deviationsActions.setDeviationForm(undefined));
                                }}
                            >
                                Cancel
                            </Button>
                            <Button color="primary" variant="contained" onClick={handleSave} disabled={!canSave}>
                                Save
                            </Button>
                        </>
                    )}
                </Box>
            </ScrollBox>
        </>
    );
}

function GroupAutocomplete({
    options,
    selected,
    label,
    onChange,
    disabled,
    error,
    helperText,
    sx,
}: {
    options: ObjectGroup[];
    selected: ObjectGroup[];
    label: string;
    onChange: (groups: ObjectGroup[]) => void;
    disabled?: boolean;
    error?: boolean;
    helperText?: string;
    sx?: SxProps<Theme>;
}) {
    return (
        <Autocomplete
            multiple
            options={options}
            getOptionLabel={(g) => g.name}
            fullWidth
            value={selected}
            onChange={(e, value) => onChange(value)}
            renderInput={(params) => <TextField {...params} label={label} error={error} helperText={helperText} />}
            disabled={disabled}
            sx={sx}
            disableCloseOnSelect
            ChipProps={{ color: "primary", variant: "outlined" }}
        />
    );
}

function mergeDeviationFormIntoProfiles(config: UiDeviationConfig, profile: UiDeviationProfile) {
    const list = [...config.profiles];
    const existingIndex = config.profiles.findIndex((p) => p.id === profile.id);

    let rebuildRequired = config.rebuildRequired;
    if (existingIndex !== -1) {
        const existing = list[existingIndex];
        const typeChanged = existing.deviationType !== profile.deviationType;
        rebuildRequired = rebuildRequired || checkIfRebuildIsRequired(existing, profile);
        if (typeChanged) {
            list.slice(existingIndex, 1);
            list.push(profile);
        } else {
            list[existingIndex] = profile;
        }
    } else {
        list.push(profile);
    }

    return {
        ...config,
        rebuildRequired,
        profiles: [
            ...list.filter((p) => p.deviationType === DeviationType.PointToTriangle),
            ...list.filter((p) => p.deviationType === DeviationType.PointToPoint),
        ],
    } as UiDeviationConfig;
}

function copyProfile(profiles: UiDeviationProfile[], source: UiDeviationProfile): DeviationForm {
    return {
        ...profileToDeviationForm(source),
        id: window.crypto.randomUUID(),
        copyFromProfileId: updateFormField(source.id),
        name: updateFormField(nextName(new Set(profiles.map((p) => p.name)), source.name)),
    };
}

function nextName(names: Set<string>, suggestion: string) {
    let i = 1;
    let result: string;
    do {
        result = `${suggestion} ${i++}`;
    } while (names.has(result));
    return result;
}

async function deviationFormToProfile({
    deviationForm,
    objectGroups,
    db,
    view,
}: {
    db: ObjectDB;
    view: View;
    deviationForm: DeviationForm;
    objectGroups: ObjectGroup[];
}): Promise<UiDeviationProfile> {
    const getGroups = (groupIds: string[]) => {
        const groups = objectGroups.filter((g) => groupIds.includes(g.id));
        const objectIds = new Set<number>();
        for (const group of groups) {
            group.ids.forEach((id) => objectIds.add(id));
        }
        return {
            groupIds,
            objectIds: [...objectIds],
        };
    };

    let centerLine: CenterLine | undefined;
    if (deviationForm.centerLine.enabled && deviationForm.centerLine.id.value) {
        const metadata = await getObjectData({ db: db!, view: view!, id: deviationForm.centerLine.id.value! });
        if (metadata) {
            const brepId = metadata.properties.find((p) => p[0] === "Novorender/PathId")?.[1];
            if (brepId) {
                centerLine = {
                    brepId,
                    parameterBounds: deviationForm.centerLine.parameterBounds.value,
                };
            }
        }
    }

    return {
        id: deviationForm.id,
        name: deviationForm.name.value,
        copyFromProfileId: deviationForm.copyFromProfileId.value,
        colors: {
            absoluteValues: deviationForm.colorSetup.absoluteValues,
            colorStops: deviationForm.colorSetup.colorStops.value,
        },
        favorites: deviationForm.favorites.value,
        centerLine,
        heightToCeiling:
            centerLine && deviationForm.tunnelInfo.enabled && Number(deviationForm.tunnelInfo.heightToCeiling.value)
                ? Number(deviationForm.tunnelInfo.heightToCeiling.value)
                : undefined,
        from: getGroups(deviationForm.groups1.value),
        to: getGroups(deviationForm.groups2.value),
        hasFromAndTo: deviationForm.hasFromAndTo,
        deviationType: deviationForm.deviationType.value,
        index: deviationForm.index,
    };
}

function checkIfRebuildIsRequired(prev: UiDeviationProfile, next: UiDeviationProfile) {
    return (
        prev.deviationType !== next.deviationType ||
        !areGroupsIdsEqual(prev.from.groupIds, next.from.groupIds) ||
        !areGroupsIdsEqual(prev.to.groupIds, next.to.groupIds) ||
        prev.centerLine?.brepId !== next.centerLine?.brepId ||
        !areArraysEqual(prev.centerLine?.parameterBounds || ([] as number[]), next.centerLine?.parameterBounds ?? []) ||
        prev.heightToCeiling !== next.heightToCeiling
    );
}

function areGroupsIdsEqual(a: string[], b: string[]) {
    return a.every((e) => b.includes(e));
}
