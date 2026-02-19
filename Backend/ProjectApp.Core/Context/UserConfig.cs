using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectApp.Core.Entities;
using ProjectApp.Core.Models;

namespace ProjectApp.Core.Context
{
    public class UserConfig : IEntityTypeConfiguration<CB_User>
    {
        public void Configure(EntityTypeBuilder<CB_User> builder)
        {
            builder.ToTable("CB_User");

            // Primary Key
            builder.HasKey(u => u.UserId);

            builder.Property(u => u.UserId)
                   .ValueGeneratedNever(); // Because DB is not Identity

            builder.Property(u => u.Fname)
                   .HasMaxLength(100)
                   .IsUnicode(false);

            builder.Property(u => u.Lname)
                   .HasMaxLength(100)
                   .IsUnicode(false);

            builder.Property(u => u.UserName)
                   .HasMaxLength(100)
                   .IsUnicode(false);

            builder.Property(u => u.Email)
                   .HasMaxLength(100)
                   .IsUnicode(false);

            builder.Property(u => u.Password)
                   .HasMaxLength(100)
                   .IsUnicode(false);

            builder.Property(u => u.EntryDate)
                   .HasColumnType("datetime");

            builder.Property(u => u.UpdateDate)
                   .HasColumnType("datetime");


            // Foreign Key -> Department
            builder.HasOne(u => u.Department)
                   .WithMany(d => d.CB_Users)
                   .HasForeignKey(u => u.DepartmentId)
                   .HasConstraintName("FK_Users_Department");
        }
    }
}