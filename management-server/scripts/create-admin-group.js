#!/usr/bin/env node

/**
 * Script pentru crearea grupului admin în Cognito
 * Usage: node scripts/create-admin-group.js [group_name]
 */

const { CognitoIdentityProviderClient, CreateGroupCommand } = require('@aws-sdk/client-cognito-identity-provider');

const GROUP_NAME = process.argv[2] || 'admin';

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

async function createAdminGroup() {
  console.log(`🔧 Creez grupul "${GROUP_NAME}" în Cognito...\n`);

  try {
    const command = new CreateGroupCommand({
      UserPoolId: USER_POOL_ID,
      GroupName: GROUP_NAME,
      Description: 'Administratori sistem - acces complet la toate business-urile',
    });

    await cognitoClient.send(command);
    
    console.log('✅ Grupul admin a fost creat cu succes!');
    console.log(`   Nume grup: ${GROUP_NAME}`);
    console.log(`   User Pool: ${USER_POOL_ID}`);
    console.log(`   Regiune: ${AWS_REGION}`);
    
    console.log('\n📝 Următorii pași:');
    console.log('   1. Adăugați utilizatorii la grup: node scripts/add-user-to-admin-group.js <email>');
    console.log('   2. Testați accesul: node scripts/test-admin-access.js <access_token>');
    
  } catch (error) {
    if (error.name === 'GroupExistsException') {
      console.log('ℹ️  Grupul admin există deja!');
      console.log(`   Nume grup: ${GROUP_NAME}`);
      console.log(`   User Pool: ${USER_POOL_ID}`);
      
      console.log('\n📝 Pentru a adăuga utilizatori:');
      console.log('   node scripts/add-user-to-admin-group.js <email>');
      
    } else {
      console.error('❌ Eroare la crearea grupului:');
      console.error(`   ${error.name}: ${error.message}`);
      
      if (error.name === 'NotAuthorizedException') {
        console.error('   Nu aveți permisiuni pentru această operație');
      }
      
      process.exit(1);
    }
  }
}

// Rulează scriptul
createAdminGroup().catch(console.error);
