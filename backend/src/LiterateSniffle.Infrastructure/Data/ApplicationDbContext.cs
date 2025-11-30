using Microsoft.EntityFrameworkCore;
using LiterateSniffle.Infrastructure.Entities;
using LiterateSniffle.Infrastructure.Data.Configurations;

namespace LiterateSniffle.Infrastructure.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<TransactionType> TransactionTypes => Set<TransactionType>();
    public DbSet<Store> Stores => Set<Store>();
    public DbSet<FileUpload> FileUploads => Set<FileUpload>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply configurations
        modelBuilder.ApplyConfiguration(new TransactionConfiguration());
        modelBuilder.ApplyConfiguration(new TransactionTypeConfiguration());
        modelBuilder.ApplyConfiguration(new StoreConfiguration());
        modelBuilder.ApplyConfiguration(new FileUploadConfiguration());

        // Seed transaction types
        SeedTransactionTypes(modelBuilder);
    }

    private static void SeedTransactionTypes(ModelBuilder modelBuilder)
    {
        var transactionTypes = new[]
        {
            new TransactionType
            {
                Id = Guid.NewGuid(),
                Code = 1,
                Name = "Debit",
                Nature = "Income",
                Description = "Debit transaction"
            },
            new TransactionType
            {
                Id = Guid.NewGuid(),
                Code = 2,
                Name = "Boleto",
                Nature = "Expense",
                Description = "Boleto payment"
            },
            new TransactionType
            {
                Id = Guid.NewGuid(),
                Code = 3,
                Name = "Financing",
                Nature = "Expense",
                Description = "Financing payment"
            },
            new TransactionType
            {
                Id = Guid.NewGuid(),
                Code = 4,
                Name = "Credit",
                Nature = "Income",
                Description = "Credit transaction"
            },
            new TransactionType
            {
                Id = Guid.NewGuid(),
                Code = 5,
                Name = "Loan Receipt",
                Nature = "Income",
                Description = "Loan receipt"
            },
            new TransactionType
            {
                Id = Guid.NewGuid(),
                Code = 6,
                Name = "Sales",
                Nature = "Income",
                Description = "Sales transaction"
            },
            new TransactionType
            {
                Id = Guid.NewGuid(),
                Code = 7,
                Name = "TED Receipt",
                Nature = "Income",
                Description = "TED receipt"
            },
            new TransactionType
            {
                Id = Guid.NewGuid(),
                Code = 8,
                Name = "DOC Receipt",
                Nature = "Income",
                Description = "DOC receipt"
            },
            new TransactionType
            {
                Id = Guid.NewGuid(),
                Code = 9,
                Name = "Rent",
                Nature = "Expense",
                Description = "Rent payment"
            }
        };

        modelBuilder.Entity<TransactionType>().HasData(transactionTypes);
    }
}
