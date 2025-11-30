using LiterateSniffle.Core.Models;
using LiterateSniffle.Infrastructure.Data;
using LiterateSniffle.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace LiterateSniffle.Core.Services;

/// <summary>
/// Service for handling file uploads and storing CNAB data
/// </summary>
public class FileUploadService
{
    private readonly ApplicationDbContext _context;
    private readonly CNABParserService _parserService;

    public FileUploadService(ApplicationDbContext context, CNABParserService parserService)
    {
        _context = context;
        _parserService = parserService;
    }

    /// <summary>
    /// Store CNAB data in the database
    /// </summary>
    public async Task<Guid> StoreCNABDataAsync(
        string filename,
        string originalName,
        int size,
        string format,
        ParsedCNABData cnabData,
        CancellationToken cancellationToken = default)
    {
        using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            // Create file upload record
            var fileUpload = new FileUpload
            {
                Id = Guid.NewGuid(),
                Filename = filename,
                OriginalName = originalName,
                Size = size,
                Format = format,
                UploadedAt = DateTime.UtcNow
            };

            _context.FileUploads.Add(fileUpload);
            await _context.SaveChangesAsync(cancellationToken);

            // Create or get stores
            var storeMap = new Dictionary<string, Guid>();

            foreach (var trans in cnabData.Transactions)
            {
                var storeKey = $"{trans.StoreOwner}|{trans.StoreName}";

                if (!storeMap.ContainsKey(storeKey))
                {
                    var existingStore = await _context.Stores
                        .FirstOrDefaultAsync(s => s.OwnerName == trans.StoreOwner && s.Name == trans.StoreName,
                            cancellationToken);

                    if (existingStore != null)
                    {
                        storeMap[storeKey] = existingStore.Id;
                    }
                    else
                    {
                        var newStore = new Store
                        {
                            Id = Guid.NewGuid(),
                            OwnerName = trans.StoreOwner,
                            Name = trans.StoreName
                        };

                        _context.Stores.Add(newStore);
                        await _context.SaveChangesAsync(cancellationToken);
                        storeMap[storeKey] = newStore.Id;
                    }
                }
            }

            // Create transactions
            foreach (var trans in cnabData.Transactions)
            {
                var storeKey = $"{trans.StoreOwner}|{trans.StoreName}";
                var storeId = storeMap[storeKey];

                var transactionEntity = new Infrastructure.Entities.Transaction
                {
                    Id = Guid.NewGuid(),
                    TypeId = trans.TypeId,
                    Type = CNABParserService.GetTransactionTypeName(trans.TypeCode),
                    Datetime = trans.Datetime,
                    Value = trans.Value,
                    Cpf = trans.Cpf,
                    Card = trans.Card,
                    StoreId = storeId,
                    FileUploadId = fileUpload.Id
                };

                _context.Transactions.Add(transactionEntity);
            }

            await _context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return fileUpload.Id;
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }
}
