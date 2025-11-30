using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using LiterateSniffle.Infrastructure.Entities;

namespace LiterateSniffle.Infrastructure.Data.Configurations;

public class TransactionConfiguration : IEntityTypeConfiguration<Transaction>
{
    public void Configure(EntityTypeBuilder<Transaction> builder)
    {
        builder.ToTable("Transaction");
        
        builder.HasKey(t => t.Id);
        
        builder.Property(t => t.Id)
            .ValueGeneratedOnAdd();
        
        builder.Property(t => t.Type)
            .IsRequired()
            .HasMaxLength(50);
        
        builder.Property(t => t.Datetime)
            .IsRequired();
        
        builder.Property(t => t.Value)
            .IsRequired()
            .HasColumnType("decimal(18,2)");
        
        builder.Property(t => t.Cpf)
            .IsRequired()
            .HasMaxLength(20);
        
        builder.Property(t => t.Card)
            .IsRequired()
            .HasMaxLength(20);
        
        // Relationships
        builder.HasOne(t => t.TransactionType)
            .WithMany(tt => tt.Transactions)
            .HasForeignKey(t => t.TypeId)
            .OnDelete(DeleteBehavior.Restrict);
        
        builder.HasOne(t => t.Store)
            .WithMany(s => s.Transactions)
            .HasForeignKey(t => t.StoreId)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.HasOne(t => t.FileUpload)
            .WithMany(f => f.Transactions)
            .HasForeignKey(t => t.FileUploadId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
