namespace SensitiveDataDemo.Models;

/// <summary>
/// Patient record model with health-related sensitive data (HIPAA)
/// </summary>
public class PatientRecord
{
    public int Id { get; set; }
    
    // Patient Identification
    public string PatientId { get; set; } = string.Empty;
    public string MedicalRecordNumber { get; set; } = string.Empty;
    public string MRN { get; set; } = string.Empty;
    
    // Personal Information
    public string PatientName { get; set; } = string.Empty;
    public string SSN { get; set; } = string.Empty;
    public DateTime DateOfBirth { get; set; }
    public string PhoneNumber { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    
    // Medical Information
    public string Diagnosis { get; set; } = string.Empty;
    public string DiagnosisCode { get; set; } = string.Empty;
    public string Treatment { get; set; } = string.Empty;
    public string PrescriptionInfo { get; set; } = string.Empty;
    public string MedicationList { get; set; } = string.Empty;
    public string LabResults { get; set; } = string.Empty;
    public string MedicalHistory { get; set; } = string.Empty;
    
    // Insurance Information
    public string InsuranceId { get; set; } = string.Empty;
    public string InsurancePolicyNumber { get; set; } = string.Empty;
    public string InsuranceGroupNumber { get; set; } = string.Empty;
    
    // Provider Information
    public string PhysicianName { get; set; } = string.Empty;
    public string PhysicianNPI { get; set; } = string.Empty;  // National Provider Identifier
}
