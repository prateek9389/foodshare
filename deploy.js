// Deployment script for deploying to Firebase hosting
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for prettier console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

console.log(`${colors.bright}${colors.magenta}=== FoodShare Deployment Script ===${colors.reset}\n`);

// Step 1: Build the Next.js application
console.log(`${colors.bright}${colors.blue}Step 1: Building the Next.js application...${colors.reset}`);
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log(`${colors.green}✅ Build completed successfully${colors.reset}\n`);
} catch (error) {
  console.error(`\n❌ Build failed: ${error.message}`);
  process.exit(1);
}

// Step 2: Deploy Firebase security rules
console.log(`${colors.bright}${colors.blue}Step 2: Deploying Firebase security rules...${colors.reset}`);
try {
  execSync('firebase deploy --only firestore:rules,storage:rules', { stdio: 'inherit' });
  console.log(`${colors.green}✅ Security rules deployed successfully${colors.reset}\n`);
} catch (error) {
  console.error(`\n❌ Security rules deployment failed: ${error.message}`);
  console.log('Continuing with hosting deployment...\n');
}

// Step 3: Deploy the application to Firebase Hosting
console.log(`${colors.bright}${colors.blue}Step 3: Deploying to Firebase Hosting...${colors.reset}`);
try {
  execSync('firebase deploy --only hosting', { stdio: 'inherit' });
  console.log(`${colors.green}✅ Application deployed successfully${colors.reset}\n`);
} catch (error) {
  console.error(`\n❌ Hosting deployment failed: ${error.message}`);
  process.exit(1);
}

console.log(`${colors.bright}${colors.cyan}=== Deployment Complete ===${colors.reset}`);
console.log(`${colors.yellow}Your application is now live!${colors.reset}`);
console.log(`Visit your Firebase Hosting URL to see the deployed application.`);
