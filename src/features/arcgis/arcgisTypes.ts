export type FeatureServerResp = {
    layers: FeatureServerRespLayer[];
};

export type FeatureServerRespLayer = {
    id: number;
    name: string;
    type: string;
    geometryType: string;
};
