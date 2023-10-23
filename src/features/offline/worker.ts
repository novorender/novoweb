import { handleIOWorkerMessages } from "@novorender/api/offline/opfs/worker";

onmessage = handleIOWorkerMessages;
