namespace LiterateSniffle.Infrastructure.Entities;

/// <summary>
/// Represents a merchant/store in the system
/// </summary>
public class Store
{
    public Guid Id { get; set; }
    
    /// <summary>
    /// Owner's name
    /// </summary>
    public string OwnerName { get; set; } = string.Empty;
    
    /// <summary>
    /// Store name
    /// </summary>
    public string Name { get; set; } = string.Empty;
    
    // Navigation properties
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
