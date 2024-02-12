param environment string
param appName string
param moduleName string
param appSettings object
param connectionStrings object
param deployApplicationInsights bool = true

// @secure()
// param trimbleClientSecret string

var webAppName = '${appName}-wa-${environment}'
var webASPName = '${moduleName}-asp-linux-${environment}'

resource appServicePlan 'Microsoft.Web/serverfarms@2021-02-01' existing = {
  name: webASPName
}

resource webApp 'Microsoft.Web/sites@2021-02-01' = {
  name: webAppName
  identity: {
    type: 'SystemAssigned'
  }
  kind: 'app,linux'
#disable-next-line no-loc-expr-outside-params
  location: resourceGroup().location
  properties: {
    reserved: true
    clientAffinityEnabled: false
    httpsOnly: true
    serverFarmId: appServicePlan.id
    siteConfig: {
      publicNetworkAccess: 'Enabled'
      linuxFxVersion: 'NODE|18-lts'
      alwaysOn: true
      http20Enabled: true
    }
  }
}

// Create-Update the webapp app settings.
module mergeSettingsModule './webAppSettings.bicep' = if(deployApplicationInsights) {
  name: '${webAppName}-appsettings'
  params: {
    webAppName: webApp.name
    currentAppSettings: list(resourceId('Microsoft.Web/sites/config', webApp.name, 'appsettings'), '2022-03-01').properties
    appSettings: {
        ApplicationInsightsAgent_EXTENSION_VERSION: '~3'
    }
  }
}

resource stagingSlot 'Microsoft.Web/sites/slots@2021-02-01' = {
  parent: webApp
  name: 'staging'
#disable-next-line no-loc-expr-outside-params
  location: resourceGroup().location
  identity: {
    type: 'SystemAssigned'
  }
  kind: 'app,linux'
  properties: {
    reserved: true
    clientAffinityEnabled: false
    httpsOnly: true
    serverFarmId: appServicePlan.id
    siteConfig: {
      publicNetworkAccess: 'Enabled'
      autoSwapSlotName: ''
      linuxFxVersion: 'NODE|18-lts'
      alwaysOn: true
      http20Enabled: true
    }
  }
}

resource stagingSlotSettings 'Microsoft.Web/sites/slots/config@2021-02-01' = {
  parent: stagingSlot
  name: 'appsettings'
  properties: appSettings
}

resource stagingSlotConnectionStrings 'Microsoft.Web/sites/slots/config@2022-09-01' = {
  parent: stagingSlot
  name: 'connectionstrings'
  properties: connectionStrings
}

output name string = webAppName
output principalId string = webApp.identity.principalId
output slotPrincipalId string = stagingSlot.identity.principalId
output fqdn string = 'https://${webApp.properties.defaultHostName}'
