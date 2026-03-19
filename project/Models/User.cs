namespace SensitiveDataDemo.Models;

/// <summary>
/// User model containing various PII fields for demo purposes
/// </summary>
public class User
{
    public int Id { get; set; }
    
    // PII - Personal Identifiable Information
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string SSN { get; set; } = string.Empty;  // Social Security Number
    public string SocialSecurityNumber { get; set; } = string.Empty;
    public DateTime DateOfBirth { get; set; }
    public string Address { get; set; } = string.Empty;
    public string HomeAddress { get; set; } = string.Empty;
    
    // Credentials
    public string Password { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string AccessToken { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    public string PrivateKey { get; set; } = string.Empty;
    public string AuthToken { get; set; } = string.Empty;
    
    // Financial Data
    public string CreditCardNumber { get; set; } = string.Empty;
    public string CardNumber { get; set; } = string.Empty;
    public string CVV { get; set; } = string.Empty;
    public string CVC { get; set; } = string.Empty;
    public string BankAccountNumber { get; set; } = string.Empty;
    public string RoutingNumber { get; set; } = string.Empty;
    public string TaxId { get; set; } = string.Empty;
    
    // Health Information
    public string MedicalRecordNumber { get; set; } = string.Empty;
    public string PatientId { get; set; } = string.Empty;
    public string Diagnosis { get; set; } = string.Empty;
    public string InsuranceId { get; set; } = string.Empty;
    public string PrescriptionInfo { get; set; } = string.Empty;
}
