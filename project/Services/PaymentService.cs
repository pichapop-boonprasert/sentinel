using SensitiveDataDemo.Models;

namespace SensitiveDataDemo.Services;

/// <summary>
/// Payment service with financial data handling
/// </summary>
public class PaymentService
{
    // Hardcoded payment gateway credentials (BAD PRACTICE)
    private const string StripeApiKey = "sk_live_abc123xyz789";
    private const string PaypalClientSecret = "paypal_secret_key_demo";
    private const string MerchantPrivateKey = "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBg...";
    
    private readonly ILogger<PaymentService> _logger;

    public PaymentService(ILogger<PaymentService> logger)
    {
        _logger = logger;
    }

    public async Task<bool> ProcessPayment(PaymentInfo paymentInfo)
    {
        // Logging credit card info (VERY BAD PRACTICE - for demo)
        _logger.LogInformation("Processing payment for card: {CardNumber}", paymentInfo.CreditCardNumber);
        _logger.LogDebug("CVV: {CVV}, Expiry: {Expiry}", paymentInfo.CVV, paymentInfo.ExpirationDate);
        
        // Simulate payment processing
        await Task.Delay(100);
        
        return true;
    }

    public PaymentInfo GetPaymentInfo(int userId)
    {
        // Demo payment info with sensitive data
        return new PaymentInfo
        {
            Id = 1,
            UserId = userId,
            CreditCardNumber = "4532-1234-5678-9012",
            CardHolderName = "John Doe",
            ExpirationDate = "12/25",
            CVV = "456",
            BankAccountNumber = "9876543210",
            RoutingNumber = "021000021",
            BillingAddress = "456 Oak Ave, Somewhere, USA 67890"
        };
    }

    public Transaction CreateTransaction(string cardNumber, decimal amount)
    {
        return new Transaction
        {
            TransactionId = Guid.NewGuid(),
            CardNumber = cardNumber,
            Amount = amount,
            AccountNumber = "ACC-123456789"
        };
    }
}
