using Microsoft.Extensions.Logging;

namespace SampleApp.Services
{
    public class UserService
    {
        private readonly ILogger<UserService> _logger;

        // --- CASE 1: firstName IS logged without mask → BOTH pii-field AND pii-logging-unmasked warnings ---
        public void LoggedWithoutMask(string firstName)
        {
            Console.WriteLine($"User: {firstName}");  // pii-logging-unmasked on firstName
            var name = firstName;                       // pii-field on firstName (because it's logged)
        }

        // --- CASE 2: lastName IS logged but WITH mask → NO warnings at all ---
        public void LoggedWithMask(string lastName)
        {
            _logger.LogInformation("User: " + MaskHelper.Mask(lastName));  // masked → no warning
            var name = lastName;                                            // no warning (masked in log)
        }

        // --- CASE 3: firstName is NOT logged at all → NO warnings ---
        public void NotLogged(string firstName, string lastName)
        {
            var displayName = firstName + " " + lastName;  // no warning (not logged)
            var user = new { FirstName = firstName };       // no warning (not logged)
            return;
        }

        // --- CASE 4: Only firstName is logged, lastName is not → warn only firstName ---
        public void PartiallyLogged(string firstName, string lastName)
        {
            Console.WriteLine("First: " + firstName);  // pii-logging-unmasked on firstName
            var full = firstName + " " + lastName;      // pii-field on firstName only (it's logged)
            // lastName has NO warnings because it's never logged
        }
    }
}
