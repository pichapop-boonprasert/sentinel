namespace SensitiveDataDemo.Services;

/// <summary>
/// Configuration service with hardcoded credentials (BAD PRACTICE - for demo)
/// </summary>
public class ConfigurationService
{
    // Hardcoded credentials (VERY BAD - for demo)
    private const string DatabasePassword = "SuperSecret123!";
    private const string ApiKey = "sk_live_abc123xyz789def456";
    private const string AwsSecretKey = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";
    private const string JwtSecret = "my-super-secret-jwt-signing-key-2024";
    
    // Connection strings with embedded credentials
    private readonly string _connectionString = 
        "Server=db.example.com;Database=production;User Id=admin;Password=Pr0d_P@ssw0rd!;";
    
    private readonly string _mongoConnectionString = 
        "mongodb://admin:MongoPass123@cluster0.mongodb.net/mydb?retryWrites=true";
    
    private readonly string _redisConnectionString = 
        "redis://default:RedisSecret456@redis-12345.c1.us-east-1.ec2.cloud.redislabs.com:12345";

    public DatabaseConfig GetDatabaseConfig()
    {
        return new DatabaseConfig
        {
            Host = "db.example.com",
            Port = 5432,
            Username = "admin",
            Password = DatabasePassword,
            DatabaseName = "production"
        };
    }

    public ApiConfig GetApiConfig()
    {
        return new ApiConfig
        {
            StripeApiKey = "sk_live_51ABC123XYZ789",
            StripeSecretKey = "whsec_abc123def456",
            SendGridApiKey = "SG.abc123.xyz789",
            TwilioAuthToken = "auth_token_12345abcde",
            GithubAccessToken = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            AwsAccessKeyId = "AKIAIOSFODNN7EXAMPLE",
            AwsSecretAccessKey = AwsSecretKey,
            AzureStorageKey = "DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=abc123==",
            GoogleApiKey = "AIzaSyABC123XYZ789-abcdefghijklmnop"
        };
    }

    public JwtConfig GetJwtConfig()
    {
        return new JwtConfig
        {
            Secret = JwtSecret,
            SigningKey = "HS256-signing-key-very-secret",
            EncryptionKey = "AES256-encryption-key-32bytes!!"
        };
    }

    public SshConfig GetSshConfig()
    {
        return new SshConfig
        {
            PrivateKey = @"-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy...
-----END RSA PRIVATE KEY-----",
            SshPassword = "ssh_password_123",
            CertificatePassword = "cert_pass_456"
        };
    }
}

public class DatabaseConfig
{
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string DatabaseName { get; set; } = string.Empty;
    public string ConnectionString { get; set; } = string.Empty;
}

public class ApiConfig
{
    public string StripeApiKey { get; set; } = string.Empty;
    public string StripeSecretKey { get; set; } = string.Empty;
    public string SendGridApiKey { get; set; } = string.Empty;
    public string TwilioAuthToken { get; set; } = string.Empty;
    public string GithubAccessToken { get; set; } = string.Empty;
    public string AwsAccessKeyId { get; set; } = string.Empty;
    public string AwsSecretAccessKey { get; set; } = string.Empty;
    public string AzureStorageKey { get; set; } = string.Empty;
    public string GoogleApiKey { get; set; } = string.Empty;
}

public class JwtConfig
{
    public string Secret { get; set; } = string.Empty;
    public string SigningKey { get; set; } = string.Empty;
    public string EncryptionKey { get; set; } = string.Empty;
}

public class SshConfig
{
    public string PrivateKey { get; set; } = string.Empty;
    public string SshPassword { get; set; } = string.Empty;
    public string CertificatePassword { get; set; } = string.Empty;
}
