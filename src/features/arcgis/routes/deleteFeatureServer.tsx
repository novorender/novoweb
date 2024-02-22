import { useHistory, useLocation } from "react-router-dom";

import { useAppDispatch } from "app/store";
import { Confirmation } from "components";

import { arcgisActions } from "../arcgisSlice";

export function DeleteFeatureServer() {
    const history = useHistory();
    const { url } = useLocation<{ url: string }>().state;
    const dispatch = useAppDispatch();

    if (!url) {
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
                    dispatch(arcgisActions.removeFeatureServer({ url: url }));
                    history.goBack();
                }}
            />
        </>
    );
}
