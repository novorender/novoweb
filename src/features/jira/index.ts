export { Jira } from "./jira";
export { jiraApi } from "./jiraApi";

export * from "./jiraSlice";

/* 

OPEN widget
    IF prev path 
        GOTO prev path

    IF cloudId / full space resource loaded
        GOTO tasks / last view

    IF NO valid jira settings (space, project, etc...)
        IF admin
            CONTINUE auth
        ELSE
            DISPLAY error (not set up, admins can fix...)

    IF Code param
        REQUEST access token
        CATCH Error
            DISPLAY error
    
    ELSE IF Refresh token
        REQUEST new access and refresh tokens
        CATCH Error
            GOTO login page

    REQUEST full space resource (incl. cloudId)
        CATCH Error
            DISPLAY error
        IF spaces NOT INCLUDE jiraSettings.space
            DISPLAY error

    IF NO valid jira settings
        GOTO jira settings page
    ELSE
        GOTO tasks
*/
