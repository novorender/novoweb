param environment string
param moduleName string

var appName = 'explorer'
var applicationInsightsName = '${moduleName}-ai-${environment}'

var assetStorageAccountName = 'nrassetstorage${environment}' // aka novorenderblobs

var keyVaultName = 'novovault-${environment}'
var keyVaultResourceGroup = 'common-${environment}'

resource appInsights 'Microsoft.Insights/components@2020-02-02' existing = {
  name: applicationInsightsName
}

var appSettings = {
    DATA_SERVER_URL: environment == 'prod' ? 'https://data-v2.novorender.com/api' : 'https://api-wa-${environment}.azurewebsites.net/api'
    DATA_V2_SERVER_URL: environment == 'prod' ? 'https://data-v2.novorender.com' : 'https://api-wa-${environment}.azurewebsites.net'
    AUTH_SERVER_URL: environment == 'prod' ? 'https://auth.novorender.com' : 'https://${environment}.auth.novorender.com'
    BIMCOLLAB_CLIENT_ID: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=bimcollab-client-id)'
    BIMCOLLAB_CLIENT_SECRET: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=bimcollab-client-secret)'
    BIMTRACK_CLIENT_ID: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=bimtrack-client-id)'
    BIMTRACK_CLIENT_SECRET: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=bimtrack-client-secret)'
    JIRA_CLIENT_ID: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=jira-client-id)'
    JIRA_CLIENT_SECRET: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=jira-client-secret)'
    XSITEMANAGE_CLIENT_ID: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=xsitemanage-client-id)'
    NOVORENDER_CLIENT_ID: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=novorender-client-id)'
    NOVORENDER_CLIENT_SECRET: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=novorender-client-secret)'
    ASSETS_URL: 'https://${assetStorageAccountName}.blob.${az.environment().suffixes.storage}/assets'
    APPINSIGHTS_INSTRUMENTATIONKEY: appInsights.properties.InstrumentationKey
    APPLICATIONINSIGHTS_CONNECTION_STRING: appInsights.properties.ConnectionString
    ApplicationInsightsAgent_EXTENSION_VERSION: '~3'
    WEBSITE_NODE_DEFAULT_VERSION: '~20'
    // WEBSITE_RUN_FROM_PACKAGE: 1
}

module nodeWebAppModule './modules/nodeWebApp.bicep' = {
  name: 'nodeWebAppModule${uniqueString(resourceGroup().id)}'
  params: {
    environment: environment
    appName: appName
    moduleName: moduleName
    appSettings: appSettings
    connectionStrings: {}
  }
}

module webAppAccessPolicy './modules/webAppAccessPolicy.bicep' = {
  name: 'webAppAccessPolicy${uniqueString(resourceGroup().id)}'
  scope: resourceGroup(keyVaultResourceGroup)
  params: {
    keyVaultName: keyVaultName
    principalId: nodeWebAppModule.outputs.principalId
  }
}

module webAppSlotAccessPolicy './modules/webAppAccessPolicy.bicep' = {
  name: 'webAppSlotAccessPolicy${uniqueString(resourceGroup().id)}'
  scope: resourceGroup(keyVaultResourceGroup)
  params: {
    keyVaultName: keyVaultName
    principalId: nodeWebAppModule.outputs.slotPrincipalId
  }
}
