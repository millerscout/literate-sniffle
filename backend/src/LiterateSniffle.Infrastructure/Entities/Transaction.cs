namespace LiterateSniffle.Infrastructure.Entities;

/// <summary>
/// Represents a CNAB transaction
/// </summary>
public class Transaction
{
    public Guid Id { get; set; }
    
    /// <summary>
    /// Foreign key to TransactionType
    /// </summary>
    public Guid TypeId { get; set; }
    
    /// <summary>
    /// Transaction type name (constrained to valid values)
    /// </summary>
    public string Type { get; set; } = string.Empty;
    
    /// <summary>
    /// Transaction date and time
    /// </summary>
    public DateTime Datetime { get; set; }
    
    /// <summary>
    /// Transaction value
    /// </summary>
    public decimal Value { get; set; }
    
    /// <summary>
    /// Customer CPF
    /// </summary>
    public string Cpf { get; set; } = string.Empty;
    
    /// <summary>
    /// Card number
    /// </summary>
    public string Card { get; set; } = string.Empty;
    
    /// <summary>
    /// Foreign key to Store
    /// </summary>
    public Guid StoreId { get; set; }
    
    /// <summary>
    /// Foreign key to FileUpload
    /// </summary>
    public Guid FileUploadId { get; set; }
    
    // Navigation properties
    public TransactionType TransactionType { get; set; } = null!;
    public Store Store { get; set; } = null!;
    public FileUpload FileUpload { get; set; } = null!;
}
