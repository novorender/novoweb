import { createAPI } from "@novorender/data-js-api";

import { getAuthHeader } from "utils/auth/getAuthHeader";

export const dataApi = createAPI({ authHeader: getAuthHeader });
