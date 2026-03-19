using Microsoft.AspNetCore.Mvc;

namespace SensitiveDataDemo.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmployeesController : ControllerBase
{
    private readonly ILogger<EmployeesController> _logger;

    public EmployeesController(ILogger<EmployeesController> logger)
    {
        _logger = logger;
    }

    [HttpGet("{id}")]
    public ActionResult<EmployeeRecord> GetEmployee(int id)
    {
        // Demo employee with comprehensive PII
        var employee = new EmployeeRecord
        {
            Id = id,
            EmployeeId = "EMP-2024-001",
            FirstName = "John",
            LastName = "Doe",
            FullName = "John Michael Doe",
            Email = "john.doe@company.com",
            PersonalEmail = "johndoe.personal@gmail.com",
            WorkPhone = "+1-555-123-4567",
            MobilePhone = "+1-555-987-6543",
            HomePhone = "+1-555-456-7890",
            SSN = "123-45-6789",
            DateOfBirth = new DateTime(1990, 5, 15),
            HomeAddress = "123 Main Street, Apt 4B, New York, NY 10001",
            EmergencyContactName = "Jane Doe",
            EmergencyContactPhone = "+1-555-111-2222",
            
            // Financial info
            BankAccountNumber = "1234567890",
            RoutingNumber = "021000021",
            TaxId = "12-3456789",
            
            // Employment details
            Salary = 85000.00m,
            DirectDepositAccount = "****6789",
            
            // Biometric data
            BiometricId = "BIO-12345-ABCDE",
            FingerprintData = "base64encodedbiometricdata..."
        };

        // Logging PII (BAD PRACTICE - for demo)
        _logger.LogInformation("Retrieved employee: {FullName}, SSN: {SSN}, Salary: {Salary}",
            employee.FullName, employee.SSN, employee.Salary);

        return Ok(employee);
    }

    [HttpPost("payroll")]
    public ActionResult ProcessPayroll([FromBody] PayrollRequest request)
    {
        // Logging sensitive payroll data
        _logger.LogInformation("Processing payroll for SSN: {SSN}, Amount: {Amount}, Account: {Account}",
            request.SSN, request.Amount, request.BankAccountNumber);

        return Ok(new { Message = "Payroll processed", EmployeeSSN = request.SSN });
    }
}

public class EmployeeRecord
{
    public int Id { get; set; }
    public string EmployeeId { get; set; } = string.Empty;
    
    // Personal Information
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PersonalEmail { get; set; } = string.Empty;
    public string WorkPhone { get; set; } = string.Empty;
    public string MobilePhone { get; set; } = string.Empty;
    public string HomePhone { get; set; } = string.Empty;
    public string SSN { get; set; } = string.Empty;
    public DateTime DateOfBirth { get; set; }
    public string HomeAddress { get; set; } = string.Empty;
    public string EmergencyContactName { get; set; } = string.Empty;
    public string EmergencyContactPhone { get; set; } = string.Empty;
    
    // Financial Information
    public string BankAccountNumber { get; set; } = string.Empty;
    public string RoutingNumber { get; set; } = string.Empty;
    public string TaxId { get; set; } = string.Empty;
    public decimal Salary { get; set; }
    public string DirectDepositAccount { get; set; } = string.Empty;
    
    // Biometric Data
    public string BiometricId { get; set; } = string.Empty;
    public string FingerprintData { get; set; } = string.Empty;
}

public class PayrollRequest
{
    public string EmployeeId { get; set; } = string.Empty;
    public string SSN { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string BankAccountNumber { get; set; } = string.Empty;
    public string RoutingNumber { get; set; } = string.Empty;
}
