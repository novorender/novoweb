export { Jira } from "./jira";
export { jiraApi } from "./jiraApi";

export * from "./jiraSlice";

/* 

OPEN widget
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

    REQUEST space resource (incl. cloudId)
        CATCH Error
            DISPLAY error

    IF NO valid jira settings
        GOTO jira settings page
    ELSE
        GOTO tasks
*/
