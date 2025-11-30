using Microsoft.AspNetCore.Mvc;
using LiterateSniffle.Core.Services;

namespace LiterateSniffle.API.Controllers;

/// <summary>
/// Controller for querying store information and summaries
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class StoresController : ControllerBase
{
    private readonly TransactionService _transactionService;
    private readonly ILogger<StoresController> _logger;

    public StoresController(
        TransactionService transactionService,
        ILogger<StoresController> logger)
    {
        _transactionService = transactionService;
        _logger = logger;
    }

    /// <summary>
    /// Get all stores with transaction summaries and balances
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Summary of all stores with transaction counts, total values, and calculated balances</returns>
    /// <response code="200">Summary of all stores with transaction statistics</response>
    /// <response code="500">Server error</response>
    [HttpGet("summary")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetSummary(CancellationToken cancellationToken)
    {
        try
        {
            var summaries = await _transactionService.GetStoreSummaryAsync(cancellationToken);
            return Ok(new { stores = summaries });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving store summaries");
            return StatusCode(500, new { error = "An error occurred while retrieving store summaries" });
        }
    }
}
