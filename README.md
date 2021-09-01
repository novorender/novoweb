# Novoweb

## Getting started

The default scene is Condos.  
Create an environment variable `REACT_APP_SCENE_ID={SCENEID}` to set a different scene as the default.  
There is no authentication in the current state of the app, so scenes has to be public.

Install dependencies  
`npm install`

Start dev server  
`npm run dev`

Create production build  
`npm run build`

Serve production build  
`PORT=5000 npm start`

## Add new widget

Add a new property to the features config.

```ts
// src/config/features.tsx

export const config = {
    //...
    myWidget: {
        key: "myWidget",
        name: "My Widget",
        Icon: WidgetIcon,
        type: FeatureType.Widget,
    },
};
```

We have the option to toggle features on/off upon viewer scene creation.
You have to add your new widget to the list of enabled features for it to appear in the widget menu.

```ts
// src/app/app.tsx

// Always enabled
function enabledFeaturesToFeatureKeys(enabledFeatures: Record<string, boolean>): FeatureKey[] {
    // ...

    return (
        Object.keys(enabledFeatures)
            // ...
            .concat(featuresConfig.myWidget.key)
    );
}

// Enable only if the selected property in the dictionary is set to enabled by admin upon scene creation.
function enabledFeaturesToFeatureKeys(enabledFeatures: Record<string, boolean>): FeatureKey[] {
    // The old viewer (and admin) apps handles feature toggling slightly different, so we use a dictionary to map our feature keys to theirs for now.
    const dictionary: Record<string, string | string[] | undefined> = {
        // ...
        properties: [featuresConfig.myWidget.key, featuresConfig.properties.key], // was featuresConfig.properties.key,
    };
}
```

Render the component inside the widget wrapper when it is open.

```tsx
// src/features/widget.tsx

function getWidgetByKey({ key, scene, view }: { key: WidgetKey; scene: Scene; view: View }): JSX.Element | string {
    switch (key) {
        // ...
        case featuresConfig.myWidget.key:
            return <MyWidget />;
    }
}
```
