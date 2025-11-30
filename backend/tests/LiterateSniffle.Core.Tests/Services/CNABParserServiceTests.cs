using Xunit;
using FluentAssertions;
using LiterateSniffle.Core.Services;
using LiterateSniffle.Core.Exceptions;

namespace LiterateSniffle.Core.Tests.Services;

public class CNABParserServiceTests
{
    private readonly CNABParserService _sut;

    public CNABParserServiceTests()
    {
        _sut = new CNABParserService();
    }

    [Fact]
    public void ParseContent_ValidCNABFile_ReturnsTransactions()
    {
        // Arrange - Each line must be exactly 80 characters
        var content = "3201903010000014200096206760174753****3153153453JOÃO MACEDO   BAR DO JOÃO       \n" +
                      "5201903010000013200556418150633123****7687145607MARIA JOSEFINALOJA DO Ó - MATRIZ\n" +
                      "3201903010000012200845152540736777****1313172712MARCOS PEREIRAMERCADO DA AVENIDA";

        // Act
        var result = _sut.ParseContent(content);

        // Assert
        result.Should().NotBeNull();
        result.Transactions.Should().HaveCount(3);
        result.Transactions[0].TypeCode.Should().Be(3);
        result.Transactions[0].Value.Should().Be(142.00m);
        result.Transactions[0].Cpf.Should().Be("09620676017");
        result.Transactions[0].Datetime.Year.Should().Be(2019);
        result.Transactions[0].Datetime.Month.Should().Be(3);
        result.Transactions[0].Datetime.Day.Should().Be(1);
    }

    [Fact]
    public void ParseContent_InvalidLineLength_ThrowsCNABParseException()
    {
        // Arrange
        var content = "320190301";

        // Act & Assert
        var action = () => _sut.ParseContent(content);
        action.Should().Throw<CNABParseException>()
            .WithMessage("*Invalid record length*");
    }

    [Fact]
    public void ParseContent_InvalidTypeCode_ThrowsCNABParseException()
    {
        // Arrange
        var content = "0201903010000014200096206760174753****3153153453JOÃO MACEDO   BAR DO JOÃO       ";

        // Act & Assert
        var action = () => _sut.ParseContent(content);
        action.Should().Throw<CNABParseException>()
            .WithMessage("*Invalid record type*");
    }

    [Fact]
    public void ValidateFile_ValidFile_ReturnsTrue()
    {
        // Arrange
        var content = "3201903010000014200096206760174753****3153153453JOÃO MACEDO   BAR DO JOÃO       ";

        // Act
        var (isValid, format, error) = _sut.ValidateFile(content);

        // Assert
        isValid.Should().BeTrue();
        format.Should().Be("CNAB 80");
        error.Should().BeNull();
    }

    [Fact]
    public void ValidateFile_EmptyFile_ReturnsFalse()
    {
        // Arrange
        var content = "";

        // Act
        var (isValid, format, error) = _sut.ValidateFile(content);

        // Assert
        isValid.Should().BeFalse();
        error.Should().Be("File is empty");
    }

    [Fact]
    public void GetTransactionTypeId_ValidCode_ReturnsCorrectGuid()
    {
        // Act
        var result = CNABParserService.GetTransactionTypeId(1);

        // Assert
        result.Should().Be(Guid.Parse("11111111-1111-1111-1111-111111111111"));
    }

    [Fact]
    public void GetTransactionTypeName_ValidCode_ReturnsCorrectName()
    {
        // Act
        var result = CNABParserService.GetTransactionTypeName(1);

        // Assert
        result.Should().Be("Debit");
    }
}
