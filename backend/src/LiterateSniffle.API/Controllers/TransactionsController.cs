using Microsoft.AspNetCore.Mvc;
using LiterateSniffle.Core.Services;

namespace LiterateSniffle.API.Controllers;

/// <summary>
/// Controller for querying CNAB transactions
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class TransactionsController : ControllerBase
{
    private readonly TransactionService _transactionService;
    private readonly ILogger<TransactionsController> _logger;

    public TransactionsController(
        TransactionService transactionService,
        ILogger<TransactionsController> logger)
    {
        _transactionService = transactionService;
        _logger = logger;
    }

    /// <summary>
    /// Get all transactions
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of all CNAB transactions stored in the database</returns>
    /// <response code="200">List of all transactions</response>
    /// <response code="500">Server error</response>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        try
        {
            var transactions = await _transactionService.GetAllTransactionsAsync(cancellationToken);
            return Ok(transactions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving all transactions");
            return StatusCode(500, new { error = "An error occurred while retrieving transactions" });
        }
    }

    /// <summary>
    /// Get transactions for a specific store
    /// </summary>
    /// <param name="storeId">Unique identifier of the store</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of transactions for the specified store</returns>
    /// <response code="200">List of transactions for the store</response>
    /// <response code="400">Missing or invalid store ID</response>
    /// <response code="500">Server error</response>
    [HttpGet("store/{storeId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetByStore(Guid storeId, CancellationToken cancellationToken)
    {
        try
        {
            var transactions = await _transactionService.GetTransactionsByStoreAsync(storeId, cancellationToken);
            return Ok(new { transactions });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving transactions for store: {StoreId}", storeId);
            return StatusCode(500, new { error = "An error occurred while retrieving transactions" });
        }
    }
}
