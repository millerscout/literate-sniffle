namespace LiterateSniffle.Core.Exceptions;

/// <summary>
/// Exception thrown when CNAB file parsing fails
/// </summary>
public class CNABParseException : Exception
{
    public CNABParseException(string message) : base(message)
    {
    }

    public CNABParseException(string message, Exception innerException) 
        : base(message, innerException)
    {
    }
}
