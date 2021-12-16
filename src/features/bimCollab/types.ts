// TODO(OLA): Mange av disse e egentlig optional fordi de e kun med i responsen fra BC extended API
// En del av string[] e egentlig ENUMs

export type Version = {
    version_id: string;
    detailed_version: string;
    build_version: string;
    branch: string;
    database_version: string;
};

export type AuthInfo = {
    oauth2_auth_url: string;
    oauth2_token_url: string;
    http_basic_supported: boolean;
    supported_oauth2_flows: string[];
};

export type User = {
    id: string;
    name: string;
};

export type ProjectExtensions = {
    topic_type: string[];
    topic_status: string[];
    topic_label: string[];
    snippet_type: string[];
    priority: string[];
    user_id_type: string[];
    stage: string[];
    project_actions: string[];
    topic_actions: string[];
    comment_actions: string[];
    team_members: {
        internal_id: number;
        email: string;
        name: string;
        role: string;
        is_deleted: true;
        is_assignable: true;
        groups: {
            internal_id: number;
            name: string;
        }[];
        company: {
            internal_id: number;
            name: string;
        };
    }[];
    favorites: string[];
    integrations: string[];
    fields: {
        index: number;
        field: string;
        is_disabled: true;
        label: string;
        mandatory: true;
        values: {
            internal_id: number;
            value: string;
            label: string;
            is_active: true;
            is_default: true;
            end_date: string;
            owner: string;
        }[];
    }[];
};

export type Project = {
    project_id: string;
    name: string;
    authorization: {
        project_actions: string[];
    };
    owner: string;
    start_date: string;
    end_date: string;
    description: string;
    project_image_id: number;
    features: string[];
    max_image_height: number;
    max_image_width: number;
    max_thumbnail_height: number;
    max_thumbnail_width: number;
    extended_data: string;
    role: string;
};

export type Topic = {
    guid: string;
    creation_date: string;
    creation_author: string;
    comments_modified_date: string;
    modified_date: string;
    modified_author: string;
    authorization: {
        topic_actions: string[];
        topic_status: string[];
    };
    favorites: string[];
    area: string;
    default_viewpoint_guid: string;
    due_date: string;
    topic_type: string;
    topic_status: string;
    reference_links: string[];
    title: string;
    priority: string;
    index: number;
    labels: string[];
    assigned_to: string | null;
    stage: string;
    description: string;
    bim_snippet: {
        snippet_type: string;
        is_external: boolean;
        reference: string;
        reference_schema: string;
    };
    customfields: {
        additionalProp1: string;
        additionalProp2: string;
        additionalProp3: string;
    };
    visibility: string;
    approvals: {
        user: string;
        approved: boolean;
    }[];
    extended_data: string;
    client_issue_id: string;
    issue_location: {
        x: number;
        y: number;
        z: number;
    };
    retrieved_on: string;
};

export type Comment = {
    guid: string;
    date: string;
    author: string;
    modified_date: string;
    modified_author: string;
    comment: string;
    topic_guid: string;
    viewpoint_guid: string;
    reply_to_comment_guid: string;
    authorization: {
        comment_actions: string[];
    };
    extended_data: string;
    retrieved_on: string;
};

export type Component = {
    ifc_guid?: string;
    originating_system?: string;
    authoring_tool_id?: string;
    // is_selected: boolean;
    // is_visible: boolean;
    // color: string;
};

export type Coloring = {
    color: string;
    components: Component[];
};

export type Visibility = {
    default_visibility?: boolean;
    exceptions?: Component[];
    view_setup_hints?: {
        spaces_visible?: boolean;
        space_boundaries_visible?: boolean;
        openings_visible?: boolean;
    };
};

export type Viewpoint = {
    guid: string;
    index: number;
    orthogonal_camera: {
        camera_view_point: {
            x: number;
            y: number;
            z: number;
        };
        camera_direction: {
            x: number;
            y: number;
            z: number;
        };
        camera_up_vector: {
            x: number;
            y: number;
            z: number;
        };
        view_to_world_scale: number;
    };
    perspective_camera: {
        camera_view_point: {
            x: number;
            y: number;
            z: number;
        };
        camera_direction: {
            x: number;
            y: number;
            z: number;
        };
        camera_up_vector: {
            x: number;
            y: number;
            z: number;
        };
        field_of_view: number;
    };
    "2d_camera": {
        viewport_client: string;
        viewport_view_name: string;
        viewport_view_type: number;
        viewport_view_story: number;
        viewport_view_id1: number;
        viewport_view_id2: number;
        viewport_view_left_top: {
            x: number;
            y: number;
        };
        viewport_view_right_bottom: {
            x: number;
            y: number;
        };
    };
    lines: {
        start_point: {
            x: number;
            y: number;
            z: number;
        };
        end_point: {
            x: number;
            y: number;
            z: number;
        };
    }[];
    clipping_planes: {
        location: {
            x: number;
            y: number;
            z: number;
        };
        direction: {
            x: number;
            y: number;
            z: number;
        };
    }[];
    bitmaps: {
        guid: string;
        bitmap_type: "jpg";
        location: {
            x: number;
            y: number;
            z: number;
        };
        normal: {
            x: number;
            y: number;
            z: number;
        };
        up: {
            x: number;
            y: number;
            z: number;
        };
        height: number;
    }[];
    snapshot: {
        snapshot_type: "jpg" | "png";
        snapshot_data: string;
    };
    is_default: boolean;
    components?: {
        selection?: Component[];
        coloring?: Coloring[];
        visibility: Visibility;
    };
    component_count: number;
    annotations: {
        origin: {
            x: number;
            y: number;
            z: number;
        };
        normal: {
            x: number;
            y: number;
            z: number;
        };
        height_point: {
            x: number;
            y: number;
            z: number;
        };
        width_point: {
            x: number;
            y: number;
            z: number;
        };
        type: number;
        line_width: number;
        color: string;
        line_type: number;
        line_startpoint_symbol: number;
        line_endpoint_symbol: number;
        char_width: number;
        text: string;
        extended_data: string;
    }[];
    dimensions: {
        first_point: {
            x: number;
            y: number;
            z: number;
        };
        first_normal: {
            x: number;
            y: number;
            z: number;
        };
        first_vector: {
            x: number;
            y: number;
            z: number;
        };
        first_type: number;
        second_point: {
            x: number;
            y: number;
            z: number;
        };
        second_normal: {
            x: number;
            y: number;
            z: number;
        };
        second_vector: {
            x: number;
            y: number;
            z: number;
        };
        second_type: number;
        is_point_to_point: boolean;
        up_vector: {
            x: number;
            y: number;
            z: number;
        };
        dir_to_camera_vector: {
            x: number;
            y: number;
            z: number;
        };
        color: string;
        line_width: number;
        text_height: number;
        first_point_symbol: number;
        second_point_symbol: number;
        endpoint_symbol_height: number;
        extended_data: string;
    }[];
    extended_data: string;
    issue_location: {
        x: number;
        y: number;
        z: number;
    };
};
