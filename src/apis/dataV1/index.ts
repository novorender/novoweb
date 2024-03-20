import { createAPI } from "@novorender/data-js-api";

import { getAuthHeader } from "utils/auth";

export const dataApi = createAPI({ authHeader: getAuthHeader });
