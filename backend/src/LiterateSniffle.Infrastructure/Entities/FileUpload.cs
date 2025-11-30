namespace LiterateSniffle.Infrastructure.Entities;

/// <summary>
/// Represents an uploaded CNAB file
/// </summary>
public class FileUpload
{
    public Guid Id { get; set; }
    
    /// <summary>
    /// Stored filename on disk
    /// </summary>
    public string Filename { get; set; } = string.Empty;
    
    /// <summary>
    /// Original filename from user upload
    /// </summary>
    public string OriginalName { get; set; } = string.Empty;
    
    /// <summary>
    /// File size in bytes
    /// </summary>
    public int Size { get; set; }
    
    /// <summary>
    /// File format identifier
    /// </summary>
    public string Format { get; set; } = string.Empty;
    
    /// <summary>
    /// Upload timestamp
    /// </summary>
    public DateTime UploadedAt { get; set; }
    
    // Navigation properties
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
