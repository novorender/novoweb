import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";

import { App } from "app";
import { store } from "app/store";

ReactDOM.render(
    <React.StrictMode>
        <Provider store={store}>
            <App />
        </Provider>
    </React.StrictMode>,
    document.body.children[0]
);

/* if ((window as any).Cypress) {
} */
(window as any).store = store;
