using Microsoft.AspNetCore.Mvc;
using SensitiveDataDemo.Models;
using SensitiveDataDemo.Services;

namespace SensitiveDataDemo.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly PaymentService _paymentService;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(PaymentService paymentService, ILogger<PaymentsController> logger)
    {
        _paymentService = paymentService;
        _logger = logger;
    }

    [HttpGet("{userId}")]
    public ActionResult<PaymentInfo> GetPaymentInfo(int userId)
    {
        var paymentInfo = _paymentService.GetPaymentInfo(userId);
        
        // Returning full credit card info (BAD PRACTICE - for demo)
        return Ok(paymentInfo);
    }

    [HttpPost("process")]
    public async Task<ActionResult> ProcessPayment([FromBody] PaymentRequest request)
    {
        // Logging full card details (VERY BAD)
        _logger.LogInformation("Processing payment: Card={CardNumber}, CVV={CVV}", 
            request.CardNumber, request.CVV);
        
        var paymentInfo = new PaymentInfo
        {
            CreditCardNumber = request.CardNumber,
            CVV = request.CVV,
            ExpirationDate = request.ExpirationDate,
            CardHolderName = request.CardHolderName
        };
        
        var success = await _paymentService.ProcessPayment(paymentInfo);
        
        if (success)
            return Ok(new { Message = "Payment processed", CardNumber = request.CardNumber });
        
        return BadRequest("Payment failed");
    }

    [HttpPost("transaction")]
    public ActionResult<Transaction> CreateTransaction([FromBody] TransactionRequest request)
    {
        var transaction = _paymentService.CreateTransaction(request.CardNumber, request.Amount);
        return Ok(transaction);
    }
}

public class PaymentRequest
{
    public string CardNumber { get; set; } = string.Empty;
    public string CVV { get; set; } = string.Empty;
    public string ExpirationDate { get; set; } = string.Empty;
    public string CardHolderName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string BankAccountNumber { get; set; } = string.Empty;
}

public class TransactionRequest
{
    public string CardNumber { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string AccountNumber { get; set; } = string.Empty;
}
