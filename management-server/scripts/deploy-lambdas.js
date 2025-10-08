#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LAMBDA_DIR = path.join(__dirname, '../infra/lambdas');
const PACKAGE_JSON = path.join(__dirname, '../infra/lambda-package.json');
const TEMP_DIR = path.join(__dirname, '../infra/temp-lambda-build');

async function deployLambdas() {
  try {
    console.log('🚀 Starting Lambda deployment...');

    // Clean up temp directory
    if (fs.existsSync(TEMP_DIR)) {
      execSync(`rm -rf ${TEMP_DIR}`);
    }
    fs.mkdirSync(TEMP_DIR, { recursive: true });

    // Copy package.json to temp directory
    fs.copyFileSync(PACKAGE_JSON, path.join(TEMP_DIR, 'package.json'));

    // Install dependencies
    console.log('📦 Installing Lambda dependencies...');
    execSync('npm install', { cwd: TEMP_DIR, stdio: 'inherit' });

    // Get list of Lambda functions
    const lambdaFiles = fs.readdirSync(LAMBDA_DIR)
      .filter(file => file.endsWith('.mjs'))
      .map(file => file.replace('.mjs', ''));

    console.log(`📋 Found Lambda functions: ${lambdaFiles.join(', ')}`);

    // Create deployment packages for each Lambda
    for (const lambdaName of lambdaFiles) {
      console.log(`📦 Creating deployment package for ${lambdaName}...`);
      
      const lambdaBuildDir = path.join(TEMP_DIR, lambdaName);
      fs.mkdirSync(lambdaBuildDir, { recursive: true });

      // Copy Lambda function
      fs.copyFileSync(
        path.join(LAMBDA_DIR, `${lambdaName}.mjs`),
        path.join(lambdaBuildDir, 'index.mjs')
      );

      // Copy node_modules
      execSync(`cp -r ${path.join(TEMP_DIR, 'node_modules')} ${lambdaBuildDir}/`);

      // Create ZIP file
      const zipPath = path.join(__dirname, '../infra', `${lambdaName}.zip`);
      execSync(`cd ${lambdaBuildDir} && zip -r ${zipPath} .`, { stdio: 'inherit' });

      console.log(`✅ Created deployment package: ${zipPath}`);
    }

    // Clean up temp directory
    execSync(`rm -rf ${TEMP_DIR}`);
    
    console.log('🎉 Lambda deployment packages created successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Upload the ZIP files to your Lambda functions using AWS CLI or Console');
    console.log('2. Update the Lambda runtime to Node.js 18.x or later');
    console.log('3. Test the functions');

  } catch (error) {
    console.error('❌ Error deploying Lambda functions:', error.message);
    process.exit(1);
  }
}

deployLambdas();
