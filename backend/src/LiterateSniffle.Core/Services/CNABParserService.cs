using LiterateSniffle.Core.Exceptions;
using LiterateSniffle.Core.Models;
using System.Globalization;

namespace LiterateSniffle.Core.Services;

/// <summary>
/// Service for parsing CNAB files
/// </summary>
public class CNABParserService
{
    private static readonly Dictionary<int, (string Name, string Nature, string Description)> TransactionTypeMap = new()
    {
        { 1, ("Debit", "Income", "Debit transaction") },
        { 2, ("Boleto", "Expense", "Boleto payment") },
        { 3, ("Financing", "Expense", "Financing payment") },
        { 4, ("Credit", "Income", "Credit transaction") },
        { 5, ("Loan Receipt", "Income", "Loan receipt") },
        { 6, ("Sales", "Income", "Sales transaction") },
        { 7, ("TED Receipt", "Income", "TED receipt") },
        { 8, ("DOC Receipt", "Income", "DOC receipt") },
        { 9, ("Rent", "Expense", "Rent payment") }
    };

    /// <summary>
    /// Get transaction type ID by code
    /// </summary>
    public static Guid GetTransactionTypeId(int code)
    {
        return code switch
        {
            1 => Guid.Parse("11111111-1111-1111-1111-111111111111"),
            2 => Guid.Parse("22222222-2222-2222-2222-222222222222"),
            3 => Guid.Parse("33333333-3333-3333-3333-333333333333"),
            4 => Guid.Parse("44444444-4444-4444-4444-444444444444"),
            5 => Guid.Parse("55555555-5555-5555-5555-555555555555"),
            6 => Guid.Parse("66666666-6666-6666-6666-666666666666"),
            7 => Guid.Parse("77777777-7777-7777-7777-777777777777"),
            8 => Guid.Parse("88888888-8888-8888-8888-888888888888"),
            9 => Guid.Parse("99999999-9999-9999-9999-999999999999"),
            _ => throw new CNABParseException($"Invalid transaction type code: {code}")
        };
    }

    /// <summary>
    /// Get transaction type name by code
    /// </summary>
    public static string GetTransactionTypeName(int code)
    {
        if (TransactionTypeMap.TryGetValue(code, out var typeInfo))
        {
            return typeInfo.Name;
        }
        throw new CNABParseException($"Invalid transaction type code: {code}");
    }

    /// <summary>
    /// Parse CNAB file content and extract transaction data
    /// </summary>
    public ParsedCNABData ParseContent(string content)
    {
        var lines = content.Split('\n')
            .Select(line => line.TrimEnd('\r', '\n'))
            .Where(line => !string.IsNullOrWhiteSpace(line))
            .ToList();

        var transactions = new List<ParsedTransaction>();

        foreach (var line in lines)
        {
            if (line.Length != 80)
            {
                throw new CNABParseException(
                    $"Invalid record length: {line.Length}. Expected 80 characters for this CNAB format.");
            }

            var typeChar = line[0];
            if (!char.IsDigit(typeChar))
            {
                throw new CNABParseException($"Invalid record type character: {typeChar}");
            }

            var type = int.Parse(typeChar.ToString());
            
            // Validate type
            if (!new[] { 1, 2, 3, 4, 5, 6, 7, 8, 9 }.Contains(type))
            {
                throw new CNABParseException($"Invalid record type: {type}");
            }

            // Skip trailer records (type 9 is often used as trailer)
            if (type == 9) continue;

            try
            {
                // Validate and parse transaction data
                var validationError = ValidateCNABDetailRecord(line, lines.IndexOf(line) + 1);
                if (validationError != null)
                {
                    throw new CNABParseException(validationError);
                }

                // Parse transaction data
                var dateStr = line.Substring(1, 8); // YYYYMMDD format
                var valueStr = line.Substring(9, 10); // 10 digits
                var cpf = line.Substring(19, 11); // 11 digits
                var card = line.Substring(30, 12); // 12 digits
                var timeStr = line.Substring(42, 6); // HHMMSS
                var storeOwner = line.Substring(48, 14).Trim();
                var storeName = line.Substring(62, 18).Trim();

                // Parse date and time (YYYYMMDD format)
                var year = int.Parse(dateStr.Substring(0, 4));
                var month = int.Parse(dateStr.Substring(4, 2));
                var day = int.Parse(dateStr.Substring(6, 2));
                var hour = int.Parse(timeStr.Substring(0, 2));
                var minute = int.Parse(timeStr.Substring(2, 2));
                var second = int.Parse(timeStr.Substring(4, 2));

                var datetime = new DateTime(year, month, day, hour, minute, second);

                // Parse value (last 2 digits are cents)
                var value = decimal.Parse(valueStr) / 100m;

                transactions.Add(new ParsedTransaction
                {
                    TypeCode = type,
                    TypeId = GetTransactionTypeId(type),
                    Datetime = datetime,
                    Value = value,
                    Cpf = cpf,
                    Card = card,
                    StoreOwner = storeOwner,
                    StoreName = storeName
                });
            }
            catch (Exception ex) when (ex is not CNABParseException)
            {
                throw new CNABParseException($"Error parsing CNAB line: {line}", ex);
            }
        }

        return new ParsedCNABData { Transactions = transactions };
    }

    /// <summary>
    /// Validate CNAB file format
    /// </summary>
    public (bool IsValid, string? Format, string? Error) ValidateFile(string content)
    {
        try
        {
            var lines = content.Split('\n')
                .Select(line => line.TrimEnd('\r', '\n'))
                .Where(line => !string.IsNullOrWhiteSpace(line))
                .ToList();

            if (lines.Count == 0)
            {
                return (false, null, "File is empty");
            }

            // Check if all lines are 80 characters
            var lineLengths = lines.Select(line => line.Length).ToList();
            var uniqueLengths = lineLengths.Distinct().ToList();
            
            if (uniqueLengths.Count != 1)
            {
                return (false, null, $"Inconsistent record lengths - not a valid CNAB file. Found lengths: {string.Join(", ", uniqueLengths)}");
            }
            
            var recordLength = uniqueLengths[0];
            if (recordLength != 80)
            {
                return (false, null, $"Invalid record length: {recordLength}. Expected 80 characters for this CNAB format.");
            }

            // Validate type codes
            var validTypeCodes = new[] { '1', '2', '3', '4', '5', '6', '7', '8', '9' };
            
            // Check first record has valid type code
            var firstRecord = lines[0];
            if (!validTypeCodes.Contains(firstRecord[0]))
            {
                return (false, null, "Missing or invalid header record");
            }

            // Validate all records have valid type codes
            for (int i = 0; i < lines.Count; i++)
            {
                var record = lines[i];
                if (!validTypeCodes.Contains(record[0]))
                {
                    return (false, null, $"Invalid record type at line {i + 1} (should start with valid type code)");
                }
            }

            // Check for trailer record (optional - type 9)
            var trailerRecord = lines[lines.Count - 1];
            if (trailerRecord[0] != '9')
            {
                // Allow files without trailer for compatibility
                Console.WriteLine("Note: File does not end with trailer record (type 9), but proceeding with validation");
            }

            // Try to parse the content
            ParseContent(content);

            return (true, "CNAB 80", null);
        }
        catch (Exception ex)
        {
            return (false, null, ex.Message);
        }
    }

    /// <summary>
    /// Validate individual CNAB detail record
    /// </summary>
    private string? ValidateCNABDetailRecord(string record, int lineNumber)
    {
        if (record.Length != 80)
        {
            return $"Line {lineNumber}: Invalid record length {record.Length}, expected 80";
        }

        // Type (position 1-1) - should be valid digit
        var type = record[0];
        if (!char.IsDigit(type))
        {
            return $"Line {lineNumber}: Invalid type '{type}', expected digit 1-9";
        }

        // Date (position 2-9) - 8 digits YYYYMMDD
        var date = record.Substring(1, 8);
        if (!System.Text.RegularExpressions.Regex.IsMatch(date, @"^\d{8}$"))
        {
            return $"Line {lineNumber}: Invalid date format '{date}', expected 8 digits";
        }

        // Validate date values (YYYYMMDD)
        if (int.TryParse(date.Substring(0, 4), out var year) &&
            int.TryParse(date.Substring(4, 2), out var month) &&
            int.TryParse(date.Substring(6, 2), out var day))
        {
            if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100)
            {
                return $"Line {lineNumber}: Invalid date '{date}'";
            }
        }

        // Value (position 10-19) - 10 digits
        var value = record.Substring(9, 10);
        if (!System.Text.RegularExpressions.Regex.IsMatch(value, @"^\d{10}$"))
        {
            return $"Line {lineNumber}: Invalid value format '{value}', expected 10 digits";
        }

        // CPF (position 20-30) - 11 digits
        var cpf = record.Substring(19, 11);
        if (!System.Text.RegularExpressions.Regex.IsMatch(cpf, @"^\d{11}$"))
        {
            return $"Line {lineNumber}: Invalid CPF format '{cpf}', expected 11 digits";
        }

        // Card (position 31-42) - 12 characters (digits or asterisks for masking)
        var card = record.Substring(30, 12);
        if (!System.Text.RegularExpressions.Regex.IsMatch(card, @"^[\d\*]{12}$"))
        {
            return $"Line {lineNumber}: Invalid card format '{card}', expected 12 digits or asterisks";
        }

        // Time (position 43-48) - 6 digits (HHMMSS)
        var time = record.Substring(42, 6);
        if (!System.Text.RegularExpressions.Regex.IsMatch(time, @"^\d{6}$"))
        {
            return $"Line {lineNumber}: Invalid time format '{time}', expected 6 digits";
        }

        // Validate time values
        if (int.TryParse(time.Substring(0, 2), out var hours) &&
            int.TryParse(time.Substring(2, 2), out var minutes) &&
            int.TryParse(time.Substring(4, 2), out var seconds))
        {
            if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59)
            {
                return $"Line {lineNumber}: Invalid time '{time}'";
            }
        }

        // Store Owner (position 49-62) - 14 characters, should not be empty
        var storeOwner = record.Substring(48, 14).Trim();
        if (string.IsNullOrWhiteSpace(storeOwner))
        {
            return $"Line {lineNumber}: Store owner name cannot be empty";
        }

        // Store Name (position 63-80) - 18 characters, should not be empty
        var storeName = record.Substring(62, 18).Trim();
        if (string.IsNullOrWhiteSpace(storeName))
        {
            return $"Line {lineNumber}: Store name cannot be empty";
        }

        return null; // Valid
    }
}
