using Microsoft.AspNetCore.Mvc;
using SensitiveDataDemo.Models;

namespace SensitiveDataDemo.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PatientsController : ControllerBase
{
    private readonly ILogger<PatientsController> _logger;

    public PatientsController(ILogger<PatientsController> logger)
    {
        _logger = logger;
    }

    [HttpGet("{id}")]
    public ActionResult<PatientRecord> GetPatient(int id)
    {
        // Demo patient with HIPAA-sensitive data
        var patient = new PatientRecord
        {
            Id = id,
            PatientId = "PAT-2024-001",
            MedicalRecordNumber = "MRN-123456",
            PatientName = "Jane Smith",
            SSN = "987-65-4321",
            DateOfBirth = new DateTime(1985, 3, 20),
            PhoneNumber = "+1-555-987-6543",
            Email = "jane.smith@email.com",
            Address = "789 Health St, Medical City, USA 11111",
            Diagnosis = "Type 2 Diabetes",
            DiagnosisCode = "E11.9",
            Treatment = "Metformin 500mg twice daily",
            PrescriptionInfo = "Rx#12345 - Metformin",
            InsuranceId = "INS-ABC-123456",
            InsurancePolicyNumber = "POL-2024-789",
            PhysicianName = "Dr. Robert Johnson",
            PhysicianNPI = "1234567890"
        };
        
        // Logging PHI (HIPAA violation - for demo)
        _logger.LogInformation("Retrieved patient: {PatientName}, SSN: {SSN}, Diagnosis: {Diagnosis}",
            patient.PatientName, patient.SSN, patient.Diagnosis);
        
        return Ok(patient);
    }

    [HttpPost]
    public ActionResult<PatientRecord> CreatePatient([FromBody] CreatePatientRequest request)
    {
        _logger.LogInformation("Creating patient record for SSN: {SSN}", request.SSN);
        
        var patient = new PatientRecord
        {
            Id = 1,
            PatientName = request.PatientName,
            SSN = request.SSN,
            DateOfBirth = request.DateOfBirth,
            Diagnosis = request.Diagnosis,
            InsuranceId = request.InsuranceId
        };
        
        return CreatedAtAction(nameof(GetPatient), new { id = patient.Id }, patient);
    }
}

public class CreatePatientRequest
{
    public string PatientName { get; set; } = string.Empty;
    public string SSN { get; set; } = string.Empty;
    public DateTime DateOfBirth { get; set; }
    public string PhoneNumber { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string Diagnosis { get; set; } = string.Empty;
    public string InsuranceId { get; set; } = string.Empty;
    public string MedicalRecordNumber { get; set; } = string.Empty;
}
