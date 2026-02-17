using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectApp.Core.Models;

namespace ProjectApp.Core.Context
{
    public class RoleConfig : IEntityTypeConfiguration<CB_Role>
    {
        public void Configure(EntityTypeBuilder<CB_Role> builder)
        {
            builder.ToTable("CB_Roles");

            // Primary Key
            builder.HasKey(r => r.RoleId);

            builder.Property(r => r.RoleId)
                   .ValueGeneratedNever(); // Because DB is NOT Identity

            builder.Property(r => r.RoleName)
                   .HasMaxLength(50)
                   .IsUnicode(false);

            builder.Property(r => r.Description)
                   .HasMaxLength(100)
                   .IsUnicode(false);

            builder.Property(r => r.EntryDate)
                   .HasColumnType("datetime");

            builder.Property(r => r.UpdateDate)
                   .HasColumnType("datetime");

          

            // Relationship with UserRoleMapping (if using many-to-many)
            builder.HasMany(r => r.CB_UserRoleMappings)
                   .WithOne(m => m.Role)
                   .HasForeignKey(m => m.RoleId)
                   .HasConstraintName("FK_Roles_UserRoleMapping");
        }
    }
}