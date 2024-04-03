import { useHistory, useLocation } from "react-router-dom";

import { useAppDispatch } from "app/redux-store-interactions";
import { Confirmation } from "components";

import { deviationsActions } from "../deviationsSlice";

export function DeleteDeviation() {
    const history = useHistory();
    const { id } = useLocation<{ id: string }>().state;
    const dispatch = useAppDispatch();

    if (!id) {
        history.goBack();
        return <></>;
    }

    return (
        <>
            <Confirmation
                title="Remove deviation profile?"
                confirmBtnText="Remove"
                onCancel={() => {
                    history.goBack();
                }}
                onConfirm={() => {
                    dispatch(deviationsActions.deleteProfile(id));
                    history.goBack();
                }}
            />
        </>
    );
}
