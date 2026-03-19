namespace SensitiveDataDemo.Models;

/// <summary>
/// Payment information model with financial sensitive data
/// </summary>
public class PaymentInfo
{
    public int Id { get; set; }
    public int UserId { get; set; }
    
    // Credit Card Information
    public string CreditCardNumber { get; set; } = string.Empty;
    public string CardHolderName { get; set; } = string.Empty;
    public string ExpirationDate { get; set; } = string.Empty;
    public string CVV { get; set; } = string.Empty;
    public string SecurityCode { get; set; } = string.Empty;
    
    // Bank Account Information
    public string BankAccountNumber { get; set; } = string.Empty;
    public string RoutingNumber { get; set; } = string.Empty;
    public string IBAN { get; set; } = string.Empty;
    public string SwiftCode { get; set; } = string.Empty;
    
    // Billing Address
    public string BillingAddress { get; set; } = string.Empty;
    public string BillingZipCode { get; set; } = string.Empty;
}

public class Transaction
{
    public Guid TransactionId { get; set; }
    public string CardNumber { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string MerchantId { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
}
