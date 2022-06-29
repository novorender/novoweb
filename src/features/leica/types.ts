export type Account = {
    url: string;
    uuid: string;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    is_active: boolean;
    is_staff: boolean;
    profile: {
        title: string;
        phone: string;
        language: string;
        account_uuid: string;
        account_url: string;
        avatar_img_url: string;
        role: { uuid: string; name: string; public: boolean; has_acl: boolean };
    };
    date_joined: string;
    last_login: string;
    is_eula_accepted: boolean;
    account_type: string;
    permissions: string[];
};

export type Project = {
    uuid: string;
    type: "PROJECT";
    name: string;
    state: string;
    project: {
        disc_quota_used: number;
        bandwidth_quota_used: number;
        timezone_offset: number;
        coordinate_system: null;
        localization: {
            name: string;
            mime: string;
            size: null;
            md5_checksum: string;
            type: null;
            machine_associations: [];
            machine_type_associations: [];
        };
        cloud_storage_quota: number;
        cloud_storage_max_file_size: number;
        disc_max_file_size: number;
        disc_quota: number;
        has_awareness_licence: boolean;
        key: string;
        timezone: string;
        bandwidth_quota: number;
        epsg: null;
        fallback_length_unit: number;
    };
    parent_uuid: string;
    sub_accounts: number;
    created_at: string;
    updated_at: string;
    country_name: string;
    waffle_flags: {
        integration: boolean;
        hide_wifi_push_config: boolean;
        move_project: boolean;
        cost_type: boolean;
        user_roles: boolean;
        pair_icon3d: boolean;
        Tesla: boolean;
        display_reference_model_revision_state_in_frontend: boolean;
        sync_page: boolean;
        VisualMachine: boolean;
        company_migrated_with_script: boolean;
        rsync_post_xfer_allowed: boolean;
        integration_infrakit: boolean;
        show_measure_point_view: boolean;
        show_ui2: boolean;
        dealer_license_report: boolean;
        app_license: boolean;
        download_points: boolean;
        Captivate: boolean;
        weak_spot_analysis: boolean;
        iconAPS: boolean;
        files_page: boolean;
        show_release_notes: boolean;
        show_pointcloud: boolean;
        use_new_tickservice: boolean;
        olaf_features: boolean;
        earthmover: boolean;
        utilization: boolean;
    };
    custom_attributes: Record<string, any>;
    has_schedule: boolean;
    schedule_template: Record<string, any>;
    permissions: string[];
    managed_storage_sum: number;
};

export type ProjectsResponse = {
    count: number;
    next: string | null;
    previous: string | null;
    results: Project[];
};

export type SearchProject = {
    country_name: string;
    model: string;
    name: string;
    project: { units: number; key: string };
    key: string;
    units: number;
    type: "PROJECT";
    uuid: string;
};

export type SearchUnit = {
    model: string;
    name: string;
    uuid: string;
    type: "UNIT";
    unit: {
        type: string;
        make: string;
        model: string;
        capacity: number;
        internal_id: string;
        online: boolean;
        equipments: [
            {
                type: string;
                serial: string;
                no_license: boolean;
                profile_entries: {
                    name: string;
                    value: string;
                }[];
            }
        ];
    };
};

export type SearchUser = {
    model: string;
    username: string;
    uuid: string;
    first_name: string;
    last_name: string;
    email: string;
    account: {
        name: string;
        uuid: string;
        type: string;
        company: {
            type: string;
        };
    };
};

export type SearchResponse = {
    count: number;
    results: (SearchProject | SearchUnit | SearchUser)[];
};

export type Unit = {
    uuid: string;
    type: "UNIT";
    name: string;
    metadata: {
        make: string;
        cost_type: string;
        model: string;
        note: string;
        internal_id: string;
        capacity: number;
        is_enabled: boolean;
        type: string;
        type_label: string;
        is_online: boolean;
        is_view_online: boolean;
        is_track_online: boolean;
        is_last_track_position_valid: boolean;
        reference_model_file_state: string;
        last_seen: null;
        server_time: number;
        reference: string;
        reference_id: string;
        can_message: boolean;
        pending_message: null;
        tags: null;
    };
};

export type UnitsResponse = {
    count: number;
    next: string | null;
    previous: string | null;
    results: Unit[];
};
