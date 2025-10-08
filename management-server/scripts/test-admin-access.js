#!/usr/bin/env node

/**
 * Script pentru testarea accesului admin
 * Usage: node scripts/test-admin-access.js <access_token>
 */

const https = require('https');

const ACCESS_TOKEN = process.argv[2];

if (!ACCESS_TOKEN) {
  console.error('❌ Te rog să furnizezi access token-ul:');
  console.error('Usage: node scripts/test-admin-access.js <access_token>');
  process.exit(1);
}

const API_BASE_URL = process.env.API_BASE_URL || 'https://your-api-domain.com';

async function testAdminAccess() {
  console.log('🔍 Testez accesul admin...\n');

  try {
    // Test 1: Verifică profilul utilizatorului
    console.log('1. Verific profilul utilizatorului...');
    const profileResponse = await makeRequest('/api/auth/profile');
    
    if (profileResponse.success) {
      const user = profileResponse.user;
      console.log('✅ Utilizator autentificat:', user.email);
      console.log('   Nume:', `${user.firstName} ${user.lastName}`);
      console.log('   Grupuri:', user.groups || 'Niciun grup');
      
      const isAdmin = user.groups?.includes('admin') || user.groups?.includes('Admin');
      console.log('   Este admin:', isAdmin ? '✅ DA' : '❌ NU');
      
      if (!isAdmin) {
        console.log('\n❌ Utilizatorul nu este admin!');
        console.log('📝 Pentru a face utilizatorul admin:');
        console.log('   1. Mergi la AWS Cognito Console');
        console.log('   2. Selectezi User Pool-ul');
        console.log('   3. Mergi la Groups și creează grupul "admin"');
        console.log('   4. Mergi la Users, selectezi utilizatorul');
        console.log('   5. În tab-ul Groups, adaugă utilizatorul la grupul "admin"');
        return;
      }
    } else {
      console.log('❌ Eroare la obținerea profilului');
      return;
    }

    // Test 2: Încearcă să acceseze endpoint-ul admin
    console.log('\n2. Testez accesul la endpoint-ul admin...');
    const adminResponse = await makeRequest('/api/businesses/admin');
    
    if (Array.isArray(adminResponse)) {
      console.log('✅ Acces admin reușit!');
      console.log(`   Găsit: ${adminResponse.length} business-uri`);
      
      if (adminResponse.length > 0) {
        console.log('\n📊 Primele 3 business-uri:');
        adminResponse.slice(0, 3).forEach((business, index) => {
          console.log(`   ${index + 1}. ${business.companyName} (${business.status})`);
        });
      }
    } else {
      console.log('❌ Eroare la accesul admin:', adminResponse);
    }

  } catch (error) {
    console.error('❌ Eroare:', error.message);
  }
}

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: new URL(API_BASE_URL).hostname,
      port: new URL(API_BASE_URL).port || 443,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(jsonData);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${jsonData.message || data}`));
          }
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Rulează testul
testAdminAccess().catch(console.error);
