using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using LiterateSniffle.Infrastructure.Entities;

namespace LiterateSniffle.Infrastructure.Data.Configurations;

public class FileUploadConfiguration : IEntityTypeConfiguration<FileUpload>
{
    public void Configure(EntityTypeBuilder<FileUpload> builder)
    {
        builder.ToTable("FileUpload");
        
        builder.HasKey(f => f.Id);
        
        builder.Property(f => f.Id)
            .ValueGeneratedOnAdd();
        
        builder.Property(f => f.Filename)
            .IsRequired()
            .HasMaxLength(255);
        
        builder.Property(f => f.OriginalName)
            .IsRequired()
            .HasMaxLength(255);
        
        builder.Property(f => f.Size)
            .IsRequired();
        
        builder.Property(f => f.Format)
            .IsRequired()
            .HasMaxLength(50);
        
        builder.Property(f => f.UploadedAt)
            .IsRequired()
            .HasColumnType("datetime")
            .HasDefaultValueSql("CURRENT_TIMESTAMP");
    }
}
