<a href="https://novorender.com/" target="_blank" rel="noopener noreferrer"><img width="233px" src="https://novorender.com/wp-content/uploads/2021/06/novorender_logo_RGB_2021.png" alt="Novorender logo"></a>

<br />
 
# Novoweb

## Getting started

The default scene is Condos.\
Create an environment variable `REACT_APP_SCENE_ID={SCENEID}` to set a different scene as the default.\

Install dependencies  
`npm install`

Start dev server  
`npm run dev`

Create production build  
`npm run build`

Serve production build  
`PORT=5000 npm start`

## Local dev

Put file `.env.local` to the root folder. Here's an example file with sensitive data removed:

```sh
###### OAUTH ######

REACT_APP_BIMCOLLAB_CLIENT_SECRET=
REACT_APP_BIMCOLLAB_CLIENT_ID=

REACT_APP_BIMTRACK_CLIENT_SECRET=
REACT_APP_BIMTRACK_CLIENT_ID=

REACT_APP_DITIO_CLIENT_SECRET=
REACT_APP_DITIO_CLIENT_ID=

REACT_APP_DITIO_RISA_CLIENT_SECRET=
REACT_APP_DITIO_RISA_CLIENT_ID=

REACT_APP_JIRA_CLIENT_SECRET=
REACT_APP_JIRA_CLIENT_ID=

REACT_APP_XSITEMANAGE_CLIENT_ID=

REACT_APP_NOVORENDER_CLIENT_ID=
REACT_APP_NOVORENDER_CLIENT_SECRET=

#####  ENV   ######

#REACT_APP_DATA_SERVER_URL=https://data-staging.novorender.com/api
REACT_APP_DATA_SERVER_URL=https://data.novorender.com/api

# Override local data address. Default is https://127.0.0.1:5000/api
DATA_SERVER_URL_PROXY_TARGET=https://127.0.0.1:5000/api

#REACT_APP_DATA_V2_SERVER_URL=/data-v2
REACT_APP_DATA_V2_SERVER_URL=https://data-v2.novorender.com

# Override local data-v2 address. Default is http://127.0.0.1:5000
DATA_V2_SERVER_URL_PROXY_TARGET=http://127.0.0.1:5000

##### SCENES ######

REACT_APP_SCENE_ID=3b3caf9359c943f48ce49055e8b3e118

REACT_APP_VERSION=$npm_package_version
```

## Add new widget

Add a new property to the features config.

```ts
// src/config/features.tsx

export const featuresConfig = {
    //...
    myWidget: {
        key: "myWidget",
        name: "My Widget",
        Icon: WidgetIcon,
        type: FeatureType.Widget,
    },
};
```

We have the option to toggle features on/off per scene.\
You have to add your new widget to the list of enabled features for it to appear in the widget menu.

```ts
// src/config/features.tsx

// Always enabled
export const defaultEnabledWidgets = [/* ..., */ featuresConfig.myWidget.key] as WidgetKey[];
```

Render the component inside the widget wrapper when it is open.

```tsx
// src/features/widgets/widgets.tsx

function getWidgetByKey({ key, scene, view }: Params): JSX.Element | string {
    switch (key) {
        // ...
        case featuresConfig.myWidget.key:
            return <MyWidget />;
    }
}
```
