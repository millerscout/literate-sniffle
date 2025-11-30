using LiterateSniffle.Infrastructure.Data;
using LiterateSniffle.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace LiterateSniffle.Core.Services;

/// <summary>
/// Service for transaction operations
/// </summary>
public class TransactionService
{
    private readonly ApplicationDbContext _context;

    public TransactionService(ApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get all transactions with related data
    /// </summary>
    public async Task<List<Transaction>> GetAllTransactionsAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Transactions
            .Include(t => t.TransactionType)
            .Include(t => t.Store)
            .Include(t => t.FileUpload)
            .OrderByDescending(t => t.Datetime)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Get transactions for a specific store
    /// </summary>
    public async Task<List<Transaction>> GetTransactionsByStoreAsync(
        Guid storeId,
        CancellationToken cancellationToken = default)
    {
        return await _context.Transactions
            .AsNoTracking()
            .Include(t => t.TransactionType)
            .Where(t => t.StoreId == storeId)
            .OrderByDescending(t => t.Datetime)
            .Select(t => new Transaction
            {
                Id = t.Id,
                TypeId = t.TypeId,
                Type = t.Type,
                Datetime = t.Datetime,
                Value = t.Value,
                Cpf = t.Cpf,
                Card = t.Card,
                StoreId = t.StoreId,
                FileUploadId = t.FileUploadId,
                TransactionType = new TransactionType
                {
                    Id = t.TransactionType.Id,
                    Code = t.TransactionType.Code,
                    Name = t.TransactionType.Name,
                    Nature = t.TransactionType.Nature,
                    Description = t.TransactionType.Description
                }
            })
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Get store summary with balance calculations
    /// </summary>
    public async Task<List<StoreSummary>> GetStoreSummaryAsync(CancellationToken cancellationToken = default)
    {
        var stores = await _context.Stores
            .Include(s => s.Transactions)
                .ThenInclude(t => t.TransactionType)
            .ToListAsync(cancellationToken);

        var summaries = stores.Select(store =>
        {
            var transactions = store.Transactions.ToList();
            var income = transactions
                .Where(t => t.TransactionType.Nature == "Income")
                .Sum(t => t.Value);
            var expense = transactions
                .Where(t => t.TransactionType.Nature == "Expense")
                .Sum(t => t.Value);
            var balance = income - expense;

            return new StoreSummary
            {
                StoreId = store.Id,
                OwnerName = store.OwnerName,
                StoreName = store.Name,
                TransactionCount = transactions.Count,
                TotalIncome = income,
                TotalExpense = expense,
                Balance = balance
            };
        }).ToList();

        return summaries;
    }
}

/// <summary>
/// Store summary DTO
/// </summary>
public class StoreSummary
{
    public Guid StoreId { get; set; }
    public string OwnerName { get; set; } = string.Empty;
    public string StoreName { get; set; } = string.Empty;
    public int TransactionCount { get; set; }
    public decimal TotalIncome { get; set; }
    public decimal TotalExpense { get; set; }
    public decimal Balance { get; set; }
}
