using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using LiterateSniffle.Infrastructure.Entities;

namespace LiterateSniffle.Infrastructure.Data.Configurations;

public class TransactionTypeConfiguration : IEntityTypeConfiguration<TransactionType>
{
    public void Configure(EntityTypeBuilder<TransactionType> builder)
    {
        builder.ToTable("TransactionType");
        
        builder.HasKey(t => t.Id);
        
        builder.Property(t => t.Id)
            .ValueGeneratedOnAdd();
        
        builder.Property(t => t.Code)
            .IsRequired();
        
        builder.HasIndex(t => t.Code)
            .IsUnique();
        
        builder.Property(t => t.Name)
            .IsRequired()
            .HasMaxLength(100);
        
        builder.Property(t => t.Nature)
            .IsRequired()
            .HasMaxLength(50);
        
        builder.Property(t => t.Description)
            .HasMaxLength(500);
    }
}
