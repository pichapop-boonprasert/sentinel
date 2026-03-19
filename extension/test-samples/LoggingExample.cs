using Microsoft.Extensions.Logging;

namespace SampleApp.Services
{
    public class UserService
    {
        private readonly ILogger<UserService> _logger;

        public void ProcessUser(string firstName, string lastName)
        {
            // These SHOULD trigger pii-logging-unmasked warnings
            Console.WriteLine($"Processing user: {firstName} {lastName}");
            _logger.LogInformation("User first name: " + firstName);
            _logger.LogWarning($"User {lastName} has issues");
            Debug.WriteLine("Name: " + firstName);

            // These should NOT trigger logging warnings (masked)
            _logger.LogInformation("User: " + MaskHelper.Mask(firstName));
            Console.WriteLine($"User: {DataMasker.Redact(lastName)}");
            _logger.LogInformation("User: [REDACTED]");

            // These should NOT trigger logging warnings (not in log context)
            var displayName = firstName + " " + lastName;
            var user = new { FirstName = firstName };

            // Multi-line logging — SHOULD trigger warning
            _logger.LogInformation(
                "User details: {0} {1}",
                firstName,
                lastName
            );
        }
    }
}
