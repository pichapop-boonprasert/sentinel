using Microsoft.AspNetCore.Mvc;
using SensitiveDataDemo.Models;
using SensitiveDataDemo.Services;

namespace SensitiveDataDemo.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly UserService _userService;
    private readonly ILogger<UsersController> _logger;

    public UsersController(UserService userService, ILogger<UsersController> logger)
    {
        _userService = userService;
        _logger = logger;
    }

    [HttpGet("{id}")]
    public ActionResult<User> GetUser(int id)
    {
        var user = _userService.GetUserById(id);
        if (user == null)
            return NotFound();
        
        // Returning sensitive data in API response (for demo)
        return Ok(user);
    }

    [HttpPost]
    public ActionResult<User> CreateUser([FromBody] CreateUserRequest request)
    {
        // Logging sensitive input (BAD PRACTICE)
        _logger.LogInformation("Creating user with email: {Email}, SSN: {SSN}", 
            request.Email, request.SSN);
        
        var user = _userService.CreateUser(request.Email, request.Password, request.SSN);
        return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
    }

    [HttpPost("login")]
    public ActionResult Login([FromBody] LoginRequest request)
    {
        if (_userService.ValidateCredentials(request.Email, request.Password))
        {
            // Generate token with sensitive data embedded (BAD)
            var token = $"token_{request.Email}_{DateTime.UtcNow.Ticks}";
            return Ok(new { AccessToken = token, Email = request.Email });
        }
        
        return Unauthorized();
    }
}

public class CreateUserRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string SSN { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string CreditCardNumber { get; set; } = string.Empty;
}

public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
