namespace LiterateSniffle.Infrastructure.Entities;

/// <summary>
/// Represents a transaction type in the CNAB system
/// </summary>
public class TransactionType
{
    public Guid Id { get; set; }
    
    /// <summary>
    /// CNAB type code (1-9)
    /// </summary>
    public int Code { get; set; }
    
    /// <summary>
    /// Descriptive name (Debit, Boleto, etc.)
    /// </summary>
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// Nature: Income or Expense
    /// </summary>
    public string Nature { get; set; } = string.Empty;
    
    /// <summary>
    /// Optional detailed description
    /// </summary>
    public string? Description { get; set; }
    
    // Navigation properties
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
