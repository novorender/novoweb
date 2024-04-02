import { Delete, Warning } from "@mui/icons-material";
import { IconButton, List, ListItemButton, Typography } from "@mui/material";
import { useMemo } from "react";

import { ObjectGroup } from "contexts/objectGroups";

import { SubprofileGroup } from "../deviationTypes";
import { DELETED_DEVIATION_LABEL } from "../utils";
import { SubprofileGroupErrors } from "../validation";

export function SubprofileList({
    subprofiles,
    errors,
    selectedIndex,
    objectGroups,
    onClick,
    onDelete,
}: {
    subprofiles: SubprofileGroup[];
    errors: SubprofileGroupErrors[];
    selectedIndex?: number;
    objectGroups: ObjectGroup[];
    onClick: (sp: SubprofileGroup, index: number) => void;
    onDelete: (sp: SubprofileGroup, index: number) => void;
}) {
    return (
        <List>
            {subprofiles.map((sp, i) => {
                return (
                    <Item
                        key={i}
                        subprofile={sp}
                        objectGroups={objectGroups}
                        onClick={() => onClick(sp, i)}
                        onDelete={() => onDelete(sp, i)}
                        selected={i === selectedIndex}
                        errors={errors[i]}
                    />
                );
            })}
        </List>
    );
}

function Item({
    subprofile,
    objectGroups,
    onClick,
    onDelete,
    disabled,
    selected,
    errors,
}: {
    subprofile: SubprofileGroup;
    objectGroups: ObjectGroup[];
    onClick: () => void;
    onDelete: () => void;
    disabled?: boolean;
    selected?: boolean;
    errors: SubprofileGroupErrors;
}) {
    const groups1 = useMemo(
        () =>
            subprofile.groups1.value
                .map((id) => objectGroups.find((g) => g.id === id)?.name ?? DELETED_DEVIATION_LABEL)
                .join(", "),
        [objectGroups, subprofile.groups1.value]
    );
    const groups2 = useMemo(
        () =>
            subprofile.groups2.value
                .map((id) => objectGroups.find((g) => g.id === id)?.name ?? DELETED_DEVIATION_LABEL)
                .join(", "),
        [objectGroups, subprofile.groups2.value]
    );

    const hasErrors = Object.values(errors).some((e) => e.error && e.active);

    return (
        <ListItemButton dense onClick={onClick} selected={selected}>
            <Typography flex="1 1 auto">
                {groups1 || (
                    <Typography color="grey" component="span">
                        [not set]
                    </Typography>
                )}
                <Typography fontWeight={600} component="span">
                    {" vs "}
                </Typography>
                {groups2 || (
                    <Typography color="grey" component="span">
                        [not set]
                    </Typography>
                )}
            </Typography>

            {hasErrors && <Warning color="error" fontSize="small" />}

            {!disabled && (
                <IconButton
                    size="small"
                    disabled={disabled}
                    onClick={(evt) => {
                        evt.stopPropagation();
                        onDelete();
                    }}
                >
                    <Delete fontSize="small" />
                </IconButton>
            )}
        </ListItemButton>
    );
}
