import { useHistory, useLocation } from "react-router-dom";

import { useAppDispatch } from "app/redux-store-interactions";
import { Confirmation } from "components";

import { arcgisActions } from "../arcgisSlice";

export function DeleteFeatureServer() {
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
                title="Remove feature server?"
                confirmBtnText="Remove"
                onCancel={() => {
                    history.goBack();
                }}
                onConfirm={() => {
                    dispatch(arcgisActions.removeFeatureServer({ id }));
                    history.goBack();
                }}
            />
        </>
    );
}
