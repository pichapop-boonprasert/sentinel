using SensitiveDataDemo.Models;

namespace SensitiveDataDemo.Services;

/// <summary>
/// Service demonstrating sensitive data handling patterns
/// </summary>
public class UserService
{
    // Hardcoded credentials (BAD PRACTICE - for demo)
    private const string ApiKey = "sk-1234567890abcdef";
    private const string SecretKey = "secret_key_abc123xyz";
    private const string DatabasePassword = "SuperSecret123!";
    private const string EncryptionKey = "aes-256-key-demo";
    
    private readonly List<User> _users = new();
    private readonly ILogger<UserService> _logger;

    public UserService(ILogger<UserService> logger)
    {
        _logger = logger;
        InitializeDemoData();
    }

    private void InitializeDemoData()
    {
        // Demo user with sensitive data
        var user = new User
        {
            Id = 1,
            FirstName = "John",
            LastName = "Doe",
            Email = "john.doe@example.com",
            PhoneNumber = "+1-555-123-4567",
            SSN = "123-45-6789",
            DateOfBirth = new DateTime(1990, 5, 15),
            Address = "123 Main St, Anytown, USA 12345",
            Password = "plaintext_password_bad",
            ApiKey = "user-api-key-12345",
            CreditCardNumber = "4111-1111-1111-1111",
            CVV = "123",
            BankAccountNumber = "1234567890",
            MedicalRecordNumber = "MRN-2024-001"
        };
        
        _users.Add(user);
    }

    public User? GetUserById(int id)
    {
        var user = _users.FirstOrDefault(u => u.Id == id);
        
        // Logging sensitive data (BAD PRACTICE - for demo)
        _logger.LogInformation("Retrieved user with SSN: {SSN}", user?.SSN);
        _logger.LogDebug("User password: {Password}", user?.Password);
        
        return user;
    }

    public User CreateUser(string email, string password, string ssn)
    {
        var user = new User
        {
            Id = _users.Count + 1,
            Email = email,
            Password = password,  // Storing plaintext password (BAD)
            SSN = ssn
        };
        
        _users.Add(user);
        return user;
    }

    public bool ValidateCredentials(string email, string password)
    {
        // Direct password comparison (BAD PRACTICE)
        return _users.Any(u => u.Email == email && u.Password == password);
    }
}
