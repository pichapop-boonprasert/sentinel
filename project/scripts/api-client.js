/**
 * API Client with sensitive data handling (BAD PRACTICES - for demo)
 * This demonstrates various credential patterns that should be detected
 */

// Hardcoded credentials (VERY BAD - for demo)
const API_KEY = 'sk_live_abc123xyz789def456ghi';
const API_SECRET = 'api_secret_super_secure_key_2024';
const ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
const BEARER_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

// AWS credentials
const AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
const AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

// Database credentials
const DB_PASSWORD = 'database_password_123';
const MONGODB_URI = 'mongodb://admin:MongoPass123@cluster0.mongodb.net/mydb';

const config = {
  stripeSecretKey: 'sk_live_51ABC123XYZ789',
  sendgridApiKey: 'SG.abc123.xyz789',
  twilioAuthToken: 'auth_token_12345abcde',
  githubAccessToken: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  jwtSecret: 'jwt-signing-secret-key-2024',
  encryptionKey: 'AES256-encryption-key-32bytes!!'
};


// Sample user data with PII
function getUserData() {
  return {
    userId: 1,
    firstName: 'Jennifer',
    lastName: 'Martinez',
    email: 'jennifer.martinez@example.com',
    phoneNumber: '+1-555-567-8901',
    ssn: '890-12-3456',
    dateOfBirth: '1993-09-10',
    address: '567 Cedar Lane, Seattle, WA 98101',
    creditCardNumber: '4916-3385-0608-2832',
    cvv: '234',
    bankAccountNumber: '4455667788',
    password: 'hashed_password_abc123'
  };
}

// Sample patient data with PHI
function getPatientData() {
  return {
    patientId: 'PAT-003',
    medicalRecordNumber: 'MRN-654321',
    patientName: 'William Anderson',
    ssn: '901-23-4567',
    diagnosis: 'Asthma',
    diagnosisCode: 'J45.20',
    treatment: 'Albuterol inhaler as needed',
    insuranceId: 'INS-GHI-789012',
    labResults: { peakFlow: 450, oxygenSaturation: 98 }
  };
}

// API call with sensitive data in logs (BAD)
async function makeApiCall(endpoint, data) {
  console.log(`Making API call with key: ${API_KEY}`);
  console.log(`User SSN: ${data.ssn}, Card: ${data.creditCardNumber}`);
  
  const response = await fetch(endpoint, {
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'X-API-Key': API_KEY,
      'X-Secret': API_SECRET
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

module.exports = { getUserData, getPatientData, makeApiCall, config };
