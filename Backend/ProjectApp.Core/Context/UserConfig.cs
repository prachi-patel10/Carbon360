using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectApp.Core.Entities;

namespace ProjectApp.Core.Context
{
    public class UserConfig : IEntityTypeConfiguration<Users>
    {
        public void Configure(EntityTypeBuilder<Users> builder)
        {
            builder.ToTable("Tbl_Users");
            builder.HasKey(u => u.Id);
            builder.Property(u => u.Id).UseIdentityColumn();
            builder.Property(u => u.UserName).IsRequired().HasMaxLength(100);
            builder.Property(u => u.Email).IsRequired().HasMaxLength(150);
            builder.Property(u => u.Password).IsRequired().HasMaxLength(200);
            builder.Property(u => u.DateOfBirth).IsRequired();
            builder.Property(u =>u.Gender).IsRequired();
            builder.Property(u => u.PhoneNumber).HasMaxLength(15);
            builder.Property(u => u.BloodGroup).HasMaxLength(5);
            builder.Property(u => u.RoleId).IsRequired();
            builder.Property(u => u.IsActive).IsRequired();
            builder.Property(u => u.IsDeleted).IsRequired();
            builder.Property(u => u.CreatedAt).IsRequired();
            builder.Property(u => u.UpdatedAt).IsRequired();
        
            builder.HasOne(u => u.Role)
                .WithMany(u => u.User)
                .HasForeignKey(u => u.RoleId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_Role_Users");
        }

    }
}
