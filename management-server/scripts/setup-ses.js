#!/usr/bin/env node

const { SESClient, VerifyEmailIdentityCommand, GetAccountAttributesCommand, SendEmailCommand } = require('@aws-sdk/client-ses');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to ask questions
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Helper function to close readline
function closeReadline() {
  rl.close();
}

async function setupSES() {
  console.log('🚀 AWS SES Setup Script pentru Simplu\n');
  
  // Get AWS credentials from environment or ask user
  const region = process.env.AWS_REGION || await askQuestion('AWS Region (default: us-east-1): ') || 'us-east-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || await askQuestion('AWS Access Key ID: ');
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || await askQuestion('AWS Secret Access Key: ');
  
  if (!accessKeyId || !secretAccessKey) {
    console.error('❌ AWS credentials sunt obligatorii!');
    closeReadline();
    return;
  }
  
  // Initialize SES client
  const sesClient = new SESClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  
  try {
    console.log('\n📊 Configurare SES...');
    
    // Test SES permissions first
    console.log('🔐 Testare permisiuni SES...');
    try {
      // Try to get account attributes to test basic SES access
      const testCommand = new GetAccountAttributesCommand({});
      await sesClient.send(testCommand);
      console.log('✅ Accesul la SES este funcțional');
    } catch (error) {
      if (error.name === 'AccessDenied' || error.message.includes('not authorized')) {
        console.log('\n❌ EROARE: Nu ai permisiunile necesare pentru SES!');
        console.log('\n📋 Pentru a rezolva această problemă:');
        console.log('1. 📝 Creează o policy IAM cu următoarele permisiuni:');
        console.log(`
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:VerifyEmailIdentity",
        "ses:GetAccountAttributes",
        "ses:SendEmail",
        "ses:GetSendQuota"
      ],
      "Resource": "*"
    }
  ]
}`);
        console.log('\n2. 🔗 Atașează această policy la utilizatorul AWS');
        console.log('3. 🚀 Rulează din nou scriptul');
        closeReadline();
        return;
      } else {
        console.log(`⚠️  Avertisment: ${error.message}`);
      }
    }
    
    // Get sender email
    const senderEmail = process.env.SES_SENDER_EMAIL || await askQuestion('\n📧 Email sender (ex: noreply@simplu.io): ');
    
    if (!senderEmail) {
      console.error('❌ Email sender este obligatoriu!');
      closeReadline();
      return;
    }
    
    // Check if user has access to the email inbox
    console.log('\n📬 Acces la inbox:');
    console.log(`Ai acces la inbox-ul pentru ${senderEmail}?`);
    const hasInboxAccess = await askQuestion('   (y/n): ');
    
    if (hasInboxAccess.toLowerCase() !== 'y' && hasInboxAccess.toLowerCase() !== 'yes') {
      console.log('\n⚠️  Fără acces la inbox! Opțiuni alternative:');
      console.log('1. 📧 Folosește un email la care ai acces (Gmail, Outlook, etc.)');
      console.log('2. 🌐 Configurează un domeniu personal și folosește email-uri de pe domeniul tău');
      console.log('3. 🔧 Folosește AWS SES cu un domeniu verificat (nu necesită verificare individuală)');
      
      const continueChoice = await askQuestion('\nVrei să continui cu verificarea acestui email? (y/n): ');
      if (continueChoice.toLowerCase() !== 'y' && continueChoice.toLowerCase() !== 'yes') {
        console.log('❌ Setup anulat. Configurează accesul la email și încearcă din nou.');
        closeReadline();
        return;
      }
      
      console.log('\n📋 Instrucțiuni pentru verificare fără acces la inbox:');
      console.log('1. 🔗 Contactează administratorul email-ului');
      console.log('2. 📬 Cere-i să verifice email-ul în AWS SES Console');
      console.log('3. 🌐 Alternativ, configurează un domeniu personal în SES');
      console.log('4. ⏳ Verificarea va rămâne pending până când cineva confirmă email-ul');
      
      const domainOption = await askQuestion('\n🌐 Vrei să configurezi verificarea domeniului în loc de email individual? (y/n): ');
      if (domainOption.toLowerCase() === 'y' || domainOption.toLowerCase() === 'yes') {
        const domain = await askQuestion('   Domeniul (ex: simplu.io): ');
        if (domain && domain.includes('.')) {
          console.log(`\n🌐 Pentru domeniul ${domain}:`);
          console.log('1. Mergi la AWS SES Console > Verified identities');
          console.log('2. Click "Create identity" > Domain');
          console.log(`3. Adaugă domeniul: ${domain}`);
          console.log('4. Configurează DNS records conform instrucțiunilor AWS');
          console.log('5. Toate email-urile de pe domeniu vor fi verificate automat');
          console.log('\n💡 Avantaje verificare domeniu:');
          console.log('- Nu trebuie să verifici fiecare email individual');
          console.log('- Poți folosi orice email de pe domeniu (noreply@, admin@, etc.)');
          console.log('- Mai profesional și scalabil');
        }
      }
    }
    
    // Verify sender email
    console.log(`\n🔐 Verificare email sender: ${senderEmail}`);
    
    try {
      const verifyCommand = new VerifyEmailIdentityCommand({
        EmailAddress: senderEmail,
      });
      
      await sesClient.send(verifyCommand);
      console.log(`✅ Cerere de verificare trimisă pentru ${senderEmail}`);
      console.log(`📬 Verifică inbox-ul și dă click pe link-ul de verificare!`);
      
    } catch (error) {
      if (error.name === 'MessageRejected' && error.message.includes('already verified')) {
        console.log(`✅ ${senderEmail} este deja verificat!`);
      } else {
        console.error(`❌ Eroare la verificarea email-ului: ${error.message}`);
        closeReadline();
        return;
      }
    }
    
    // Get additional emails to verify
    console.log('\n📝 Email-uri adiționale pentru verificare (opțional):');
    const additionalEmails = [];
    
    while (true) {
      const email = await askQuestion('   Email (sau Enter pentru a continua): ');
      if (!email) break;
      
      if (email.includes('@')) {
        additionalEmails.push(email);
        
        try {
          const verifyCommand = new VerifyEmailIdentityCommand({
            EmailAddress: email,
          });
          
          await sesClient.send(verifyCommand);
          console.log(`   ✅ Cerere de verificare trimisă pentru ${email}`);
        } catch (error) {
          if (error.name === 'MessageRejected' && error.message.includes('already verified')) {
            console.log(`   ✅ ${email} este deja verificat!`);
          } else {
            console.log(`   ❌ Eroare pentru ${email}: ${error.message}`);
          }
        }
      } else {
        console.log('   ❌ Email invalid!');
      }
    }
    
    // Generate environment configuration
    console.log('\n📋 Configurare pentru .env:');
    console.log('=====================================');
    console.log(`# Email (SES)`);
    console.log(`SES_SENDER_EMAIL=${senderEmail}`);
    console.log(`AWS_REGION=${region}`);
    console.log(`AWS_ACCESS_KEY_ID=${accessKeyId}`);
    console.log(`AWS_SECRET_ACCESS_KEY=${secretAccessKey}`);
    
    if (additionalEmails.length > 0) {
      console.log('\n# Email-uri verificate:');
      additionalEmails.forEach(email => {
        console.log(`# ${email}`);
      });
    }
    
    console.log('\n=====================================');
    
    // Instructions for production
    console.log('\n📚 Instrucțiuni pentru producție:');
    console.log('1. ✅ Verifică toate email-urile în inbox (dacă ai acces)');
    console.log('2. 🌐 Alternativ: verifică domeniul complet în SES Console:');
    console.log('   - Mergi la AWS SES Console > Verified identities');
    console.log('   - Click "Create identity" > Domain');
    console.log('   - Adaugă domeniul tău (ex: simplu.io)');
    console.log('   - Configurează DNS records pentru verificare');
    console.log('   - Toate email-urile de pe domeniu vor fi verificate automat');
    console.log('3. 🔧 Configurează SPF, DKIM și DMARC pentru domeniul tău');
    console.log('4. 📊 Monitorizează bounce rate și complaint rate în AWS Console');
    
    // Test email option
    const testEmail = await askQuestion('\n🧪 Vrei să trimiți un email de test? (y/n): ');
    
    if (testEmail.toLowerCase() === 'y' || testEmail.toLowerCase() === 'yes') {
      const testRecipient = await askQuestion('   Email destinatar pentru test: ');
      
      if (testRecipient && testRecipient.includes('@')) {
        try {
          const testCommand = new SendEmailCommand({
            Source: senderEmail,
            Destination: {
              ToAddresses: [testRecipient],
            },
            Message: {
              Subject: { Data: 'Test Email - Simplu SES Setup', Charset: 'UTF-8' },
              Body: {
                Html: { 
                  Data: `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                      <h2>✅ Test Email din Simplu</h2>
                      <p>Acest email confirmă că SES este configurat corect!</p>
                      <p><strong>Sender:</strong> ${senderEmail}</p>
                      <p><strong>Data:</strong> ${new Date().toLocaleString('ro-RO')}</p>
                      <hr>
                      <p><small>Simplu - Management Server</small></p>
                    </div>
                  `, 
                  Charset: 'UTF-8' 
                },
              },
            },
          });
          
          await sesClient.send(testCommand);
          console.log(`✅ Email de test trimis cu succes la ${testRecipient}!`);
          
        } catch (error) {
          console.error(`❌ Eroare la trimiterea email-ului de test: ${error.message}`);
        }
      }
    }
    
    console.log('\n🎉 Setup SES completat cu succes!');
    
  } catch (error) {
    console.error(`❌ Eroare la setup SES: ${error.message}`);
    
    if (error.name === 'InvalidUserPoolConfigurationException') {
      console.log('\n💡 Sugestii:');
      console.log('- Verifică că AWS credentials sunt corecte');
      console.log('- Verifică că regiunea este corectă');
      console.log('- Verifică că contul AWS are permisiuni pentru SES');
    }
  }
  
  closeReadline();
}

// Handle script arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🚀 AWS SES Setup Script pentru Simplu

Utilizare:
  node setup-ses.js

Variabile de mediu opționale:
  AWS_REGION - regiunea AWS (default: us-east-1)
  AWS_ACCESS_KEY_ID - AWS Access Key ID
  AWS_SECRET_ACCESS_KEY - AWS Secret Access Key
  SES_SENDER_EMAIL - email-ul sender

Permisiuni IAM necesare:
  - ses:VerifyEmailIdentity
  - ses:GetAccountAttributes
  - ses:SendEmail
  - ses:GetSendQuota

Exemplu:
  AWS_REGION=us-east-1 node setup-ses.js
`);
  process.exit(0);
}

// Run the setup
setupSES().catch(console.error);
