import { FormEvent, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { Confirmation } from "components";

interface ClearConfirmationProps {
    title?: string;
    onClear: () => void;
}

export function ClearConfirmation({ title, onClear }: ClearConfirmationProps) {
    const { t } = useTranslation();
    const history = useHistory();

    const handleClear = useCallback(
        (e: FormEvent) => {
            e.preventDefault();
            onClear();
            history.goBack();
        },
        [onClear, history],
    );

    return (
        <Confirmation
            title={t("clearForm", { title })}
            confirmBtnText={t("clear")}
            onCancel={() => history.goBack()}
            component="form"
            onSubmit={handleClear}
            headerShadow={false}
        />
    );
}
