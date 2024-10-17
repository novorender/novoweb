import { Box, List, Stack, Typography, useTheme } from "@mui/material";
import { ChangeEvent, Fragment, type SetStateAction, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Permission } from "apis/dataV2/permissions";
import { Divider, ScrollBox, TextField } from "components";
import { Signature, Signatures } from "features/forms/components/signatures";
import { TransformEditor } from "features/forms/components/transformEditor";
import { type Form, type FormItem as FItype } from "features/forms/types";
import { toFormItems } from "features/forms/utils";
import { useCheckProjectPermission } from "hooks/useCheckProjectPermissions";

import { FormItem } from "./formItem";

interface FormProperties {
    form?: Partial<Form>;
    title: string;
    handleTitleChange?: (event: ChangeEvent<HTMLInputElement>) => void;
    items?: FItype[];
    setItems?: (item: SetStateAction<FItype[]>) => void;
    noItemsMsg?: string;
    disabled?: boolean;
    populateEditor?: boolean;
}

export function Form({
    form,
    title,
    handleTitleChange,
    items = form?.fields ? toFormItems(form?.fields) : [],
    setItems,
    noItemsMsg,
    disabled,
    populateEditor,
}: FormProperties) {
    const { t } = useTranslation();
    const theme = useTheme();
    const checkPermission = useCheckProjectPermission();
    const canEdit = checkPermission(Permission.FormsFill);

    const isFinal = useMemo(() => form?.isFinal ?? false, [form]);
    const finalSignature = useMemo(
        () => (form?.isFinal ? form.signatures?.find((s) => s.isFinal) : undefined),
        [form?.isFinal, form?.signatures],
    );

    const isGeoForm = useMemo(() => Boolean(form?.location), [form]);

    if (items?.length === 0) {
        return noItemsMsg ? (
            <Typography my={1} px={1}>
                {noItemsMsg}
            </Typography>
        ) : null;
    }

    return (
        <ScrollBox my={1} px={1}>
            <Box mt={2} mb={isFinal ? 0 : 2}>
                <TextField
                    label={t("formName")}
                    value={title}
                    onChange={handleTitleChange}
                    fullWidth
                    disabled={disabled || !canEdit || isFinal}
                />
            </Box>
            {finalSignature && (
                <List dense sx={{ my: 2, bgcolor: theme.palette.grey[100] }}>
                    <Signature signature={finalSignature!} />
                </List>
            )}
            {items?.map((item, idx, array) => (
                <Fragment key={item.id}>
                    <FormItem item={item} setItems={setItems} disabled={disabled || !canEdit || isFinal} />
                    {idx !== array.length - 1 ? <Divider sx={{ mt: 1, mb: 2 }} /> : null}
                </Fragment>
            ))}
            <Stack gap={1} mt={2}>
                {isGeoForm && (
                    <TransformEditor
                        disabled={disabled || !canEdit || isFinal}
                        form={populateEditor ? form : undefined}
                    />
                )}
                <Signatures signatures={form?.signatures} />
            </Stack>
        </ScrollBox>
    );
}
