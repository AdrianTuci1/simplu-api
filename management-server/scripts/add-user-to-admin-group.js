#!/usr/bin/env node

/**
 * Script pentru adăugarea unui utilizator la grupul admin
 * Usage: node scripts/add-user-to-admin-group.js <email> [group_name]
 */

const { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } = require('@aws-sdk/client-cognito-identity-provider');

const EMAIL = process.argv[2];
const GROUP_NAME = process.argv[3] || 'admin';

if (!EMAIL) {
  console.error('❌ Te rog să furnizezi email-ul utilizatorului:');
  console.error('Usage: node scripts/add-user-to-admin-group.js <email> [group_name]');
  console.error('Example: node scripts/add-user-to-admin-group.js admin@example.com');
  process.exit(1);
}

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

if (!USER_POOL_ID) {
  console.error('❌ COGNITO_USER_POOL_ID nu este setat în variabilele de mediu');
  process.exit(1);
}

const cognitoClient = new CognitoIdentityProviderClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function addUserToAdminGroup() {
  console.log(`🔧 Adaug utilizatorul ${EMAIL} la grupul "${GROUP_NAME}"...\n`);

  try {
    const command = new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: EMAIL,
      GroupName: GROUP_NAME,
    });

    await cognitoClient.send(command);
    
    console.log('✅ Utilizatorul a fost adăugat cu succes la grupul admin!');
    console.log(`   Email: ${EMAIL}`);
    console.log(`   Grup: ${GROUP_NAME}`);
    console.log(`   User Pool: ${USER_POOL_ID}`);
    
    console.log('\n🎉 Acum utilizatorul poate accesa endpoint-ul admin!');
    console.log('📝 Pentru a testa: node scripts/test-admin-access.js <access_token>');
    
  } catch (error) {
    console.error('❌ Eroare la adăugarea utilizatorului la grup:');
    
    if (error.name === 'NotAuthorizedException') {
      console.error('   Nu aveți permisiuni pentru această operație');
    } else if (error.name === 'UserNotFoundException') {
      console.error(`   Utilizatorul ${EMAIL} nu există în User Pool`);
    } else if (error.name === 'GroupNotFoundException') {
      console.error(`   Grupul "${GROUP_NAME}" nu există în User Pool`);
      console.error('   📝 Creați grupul mai întâi prin AWS Console sau CLI');
    } else {
      console.error(`   ${error.name}: ${error.message}`);
    }
    
    process.exit(1);
  }
}

// Rulează scriptul
addUserToAdminGroup().catch(console.error);
