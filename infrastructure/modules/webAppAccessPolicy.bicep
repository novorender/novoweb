param keyVaultName string
param principalId string

resource keyVault 'Microsoft.KeyVault/vaults@2019-09-01' existing = {
  name: keyVaultName
}

resource accessPolicies 'Microsoft.KeyVault/vaults/accessPolicies@2022-07-01' = {
  name: 'add'
  parent: keyVault
  properties: {
    accessPolicies: [
      {
        objectId:'a1491eac-9751-4670-a4f8-dc251476a87e'
        tenantId:keyVault.properties.tenantId
        permissions:{
          keys: ['Get','List']
          secrets: ['Get','List']
          certificates: ['Get','List']
        }
      }
      {
        tenantId: keyVault.properties.tenantId
        objectId: principalId
        permissions: {
          secrets: ['get','List']
        }
      }
    ]
  }
}
