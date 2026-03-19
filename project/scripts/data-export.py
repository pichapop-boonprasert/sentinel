#!/usr/bin/env python3
"""
Data export script with sensitive data handling (BAD PRACTICES - for demo)
This demonstrates various patterns that should be detected by the extension
"""

import json
import logging

# Hardcoded credentials (VERY BAD - for demo)
DATABASE_PASSWORD = "db_password_123"
API_KEY = "sk_live_abc123xyz789"
AWS_SECRET_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
JWT_SECRET = "jwt-signing-secret-key-2024"

# Connection strings with embedded credentials
POSTGRES_CONNECTION = "postgresql://admin:SecretPass123@db.example.com:5432/production"
MONGODB_URI = "mongodb://user:MongoPass456@cluster0.mongodb.net/mydb"
REDIS_URL = "redis://default:RedisSecret789@redis.example.com:6379"

def get_user_data():
    """Returns sample user data with PII"""
    return {
        "user_id": 1,
        "first_name": "Sarah",
        "last_name": "Johnson",
        "email": "sarah.johnson@example.com",
        "phone_number": "+1-555-456-7890",
        "ssn": "678-90-1234",
        "social_security_number": "678-90-1234",
        "date_of_birth": "1985-06-15",
        "home_address": "321 Elm Street, Boston, MA 02101",
        "credit_card_number": "4532-8765-4321-0987",
        "cvv": "321",
        "bank_account_number": "5566778899",
        "routing_number": "021000021",
        "password": "hashed_password_xyz",
        "api_key": API_KEY,
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }

def get_patient_record():
    """Returns sample patient data with PHI (HIPAA)"""
    return {
        "patient_id": "PAT-2024-002",
        "medical_record_number": "MRN-123456",
        "mrn": "MRN-123456",
        "patient_name": "David Miller",
        "ssn": "789-01-2345",
        "date_of_birth": "1970-03-25",
        "diagnosis": "Type 1 Diabetes",
        "diagnosis_code": "E10.9",
        "icd_code": "E10.9",
        "treatment": "Insulin therapy",
        "prescription_info": "Rx#11111 - Insulin Lispro",
        "medication_list": ["Insulin Lispro", "Metformin"],
        "lab_results": {
            "blood_pressure": "130/85",
            "glucose_level": 180,
            "hemoglobin_a1c": 7.2,
            "cholesterol": 195
        },
        "genetic_data": "BRCA1: Negative",
        "insurance_id": "INS-DEF-456789",
        "insurance_policy_number": "POL-2024-456",
        "medicare_id": "1AB2-CD3-EF45",
        "physician_npi": "9876543210"
    }

def get_payment_info():
    """Returns sample payment data"""
    return {
        "card_number": "5425233430109903",
        "credit_card_number": "5425-2334-3010-9903",
        "card_holder_name": "David Miller",
        "expiration_date": "08/26",
        "cvv": "456",
        "security_code": "456",
        "bank_account_number": "9988776655",
        "routing_number": "021000089",
        "iban": "GB82WEST12345698765432",
        "swift_code": "WESTGB2L",
        "tax_id": "98-7654321"
    }

def export_data():
    """Export all data (logging sensitive info - BAD)"""
    user = get_user_data()
    patient = get_patient_record()
    payment = get_payment_info()
    
    # Logging sensitive data (VERY BAD - for demo)
    logging.info(f"Exporting user: {user['email']}, SSN: {user['ssn']}")
    logging.info(f"Patient diagnosis: {patient['diagnosis']}, MRN: {patient['mrn']}")
    logging.info(f"Payment card: {payment['card_number']}, CVV: {payment['cvv']}")
    
    return {
        "user": user,
        "patient": patient,
        "payment": payment,
        "config": {
            "database_password": DATABASE_PASSWORD,
            "api_key": API_KEY,
            "jwt_secret": JWT_SECRET
        }
    }

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    data = export_data()
    print(json.dumps(data, indent=2))
