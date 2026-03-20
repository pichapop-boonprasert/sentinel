using Microsoft.Extensions.Logging;

public class MaskingTestController
{
    private readonly ILogger _logger;

    public void TestMasking(PaymentRequest request)
    {
        // Should show warning - no masking
        _logger.LogInformation("CVV: {CVV}", request.CVV);
        
        // Should NOT show warning - using .abc() masking
        _logger.LogInformation("CVV: {CVV}", request.CVV.abc());
        
        // Should NOT show warning - using .Mask() masking
        _logger.LogInformation("CVV: {CVV}", request.CVV.Mask());
        
        // Should NOT show warning - using Mask() wrapper
        _logger.LogInformation("CVV: {CVV}", Mask(request.CVV));
    }
}

public class PaymentRequest
{
    public string CVV { get; set; }
}
