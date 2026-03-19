using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace SampleApp.Models
{
    public class UserProfile
    {
        public int Id { get; set; }

        // These should trigger PII warnings
        public string FirstName { get; set; }
        public string LastName { get; set; }

        [JsonPropertyName("first_name")]
        public string First { get; set; }

        [Column("last_name")]
        public string Last { get; set; }

        // These should NOT trigger warnings
        public string Email { get; set; }
        public int Age { get; set; }
        public string Address { get; set; }
    }

    public class UserService
    {
        public void CreateUser()
        {
            // Variable names with PII
            var firstName = "John";
            var lastName = "Doe";

            // Safe variables
            var userId = 123;
            var isActive = true;
        }

        public string GetFullName(string firstName, string lastName)
        {
            return $"{firstName} {lastName}";
        }

        public void QueryExample()
        {
            // String literals with PII field names
            var query = "SELECT first_name, last_name FROM users";
            var mapping = new Dictionary<string, string>
            {
                { "firstName", "John" },
                { "lastName", "Doe" }
            };
        }
    }
}
