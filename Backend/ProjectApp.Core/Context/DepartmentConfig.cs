using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectApp.Core.Models;

namespace ProjectApp.Core.Context
{
    public class DepartmentConfig : IEntityTypeConfiguration<CB_Department>
    {
        public void Configure(EntityTypeBuilder<CB_Department> builder)
        {
            builder.ToTable("CB_Departments");

            // Primary Key
            builder.HasKey(d => d.DepartmentId);

            builder.Property(d => d.DepartmentId)
                   .ValueGeneratedNever(); // Not Identity

            builder.Property(d => d.DepartmentName)
                   .HasMaxLength(50)
                   .IsUnicode(false);

            builder.Property(d => d.EntryDate)
                   .HasColumnType("datetime");

            builder.Property(d => d.UpdateDate)
                   .HasColumnType("datetime");

            // Relationship with Users
            builder.HasMany(d => d.CB_Users)
                   .WithOne(u => u.Department)
                   .HasForeignKey(u => u.DepartmentId)
                   .HasConstraintName("FK_Users_Department");
        }
    }
}