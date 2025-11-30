namespace LiterateSniffle.Core.Exceptions;

/// <summary>
/// Exception thrown when validation fails
/// </summary>
public class ValidationException : Exception
{
    public string Field { get; }

    public ValidationException(string field, string message) : base(message)
    {
        Field = field;
    }
}
