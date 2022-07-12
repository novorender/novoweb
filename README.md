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
