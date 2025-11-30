namespace LiterateSniffle.Core.Models;

/// <summary>
/// Represents a parsed transaction from CNAB file
/// </summary>
public class ParsedTransaction
{
    public int TypeCode { get; set; }
    public Guid TypeId { get; set; }
    public DateTime Datetime { get; set; }
    public decimal Value { get; set; }
    public string Cpf { get; set; } = string.Empty;
    public string Card { get; set; } = string.Empty;
    public string StoreOwner { get; set; } = string.Empty;
    public string StoreName { get; set; } = string.Empty;
}

/// <summary>
/// Represents parsed CNAB file data
/// </summary>
public class ParsedCNABData
{
    public List<ParsedTransaction> Transactions { get; set; } = new();
}
