using Microsoft.AspNetCore.Mvc;

namespace SensitiveDataDemo.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LabResultsController : ControllerBase
{
    private readonly ILogger<LabResultsController> _logger;

    public LabResultsController(ILogger<LabResultsController> logger)
    {
        _logger = logger;
    }

    [HttpGet("{patientId}")]
    public ActionResult<LabReport> GetLabResults(string patientId)
    {
        var labReport = new LabReport
        {
            PatientId = patientId,
            MedicalRecordNumber = "MRN-789456",
            PatientName = "Alice Johnson",
            DateOfBirth = new DateTime(1975, 8, 22),
            SSN = "456-78-9012",
            
            // Lab test results (PHI)
            BloodPressure = "120/80 mmHg",
            HeartRate = 72,
            Temperature = 98.6,
            GlucoseLevel = 95.5,
            CholesterolTotal = 185,
            HemoglobinA1c = 5.4,
            
            // Detailed test results
            TestResults = new List<TestResult>
            {
                new() { TestName = "Complete Blood Count", LoincCode = "58410-2", Value = "Normal", Unit = "" },
                new() { TestName = "Lipid Panel", LoincCode = "24331-1", Value = "185", Unit = "mg/dL" },
                new() { TestName = "Glucose Fasting", LoincCode = "1558-6", Value = "95", Unit = "mg/dL" },
                new() { TestName = "HIV Test", LoincCode = "7917-8", Value = "Negative", Unit = "" },
                new() { TestName = "Hepatitis B", LoincCode = "5195-3", Value = "Non-reactive", Unit = "" }
            },
            
            // Genetic data
            GeneticMarkers = "BRCA1: Negative, BRCA2: Negative",
            DnaSequenceId = "DNA-SEQ-2024-001",
            
            // Provider info
            OrderingPhysician = "Dr. Sarah Williams",
            PhysicianNPI = "1234567890",
            
            // Insurance
            InsurancePolicyNumber = "POL-ABC-123456",
            MemberId = "MEM-789012"
        };

        // Logging PHI (HIPAA violation - for demo)
        _logger.LogInformation("Lab results for patient {PatientName}, MRN: {MRN}, HIV: {HIVResult}",
            labReport.PatientName, labReport.MedicalRecordNumber, 
            labReport.TestResults.First(t => t.TestName == "HIV Test").Value);

        return Ok(labReport);
    }

    [HttpPost("order")]
    public ActionResult OrderLabTest([FromBody] LabOrderRequest request)
    {
        _logger.LogInformation("Lab order for patient SSN: {SSN}, Test: {Test}",
            request.PatientSSN, request.TestName);

        return Ok(new { OrderId = Guid.NewGuid(), PatientSSN = request.PatientSSN });
    }
}

public class LabReport
{
    public string PatientId { get; set; } = string.Empty;
    public string MedicalRecordNumber { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public DateTime DateOfBirth { get; set; }
    public string SSN { get; set; } = string.Empty;
    
    // Vital Signs
    public string BloodPressure { get; set; } = string.Empty;
    public int HeartRate { get; set; }
    public double Temperature { get; set; }
    public double GlucoseLevel { get; set; }
    public int CholesterolTotal { get; set; }
    public double HemoglobinA1c { get; set; }
    
    // Test Results
    public List<TestResult> TestResults { get; set; } = new();
    
    // Genetic Data
    public string GeneticMarkers { get; set; } = string.Empty;
    public string DnaSequenceId { get; set; } = string.Empty;
    
    // Provider
    public string OrderingPhysician { get; set; } = string.Empty;
    public string PhysicianNPI { get; set; } = string.Empty;
    
    // Insurance
    public string InsurancePolicyNumber { get; set; } = string.Empty;
    public string MemberId { get; set; } = string.Empty;
}

public class TestResult
{
    public string TestName { get; set; } = string.Empty;
    public string LoincCode { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
}

public class LabOrderRequest
{
    public string PatientId { get; set; } = string.Empty;
    public string PatientSSN { get; set; } = string.Empty;
    public string TestName { get; set; } = string.Empty;
    public string DiagnosisCode { get; set; } = string.Empty;
}
