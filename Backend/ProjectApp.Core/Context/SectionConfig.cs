using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectApp.Core.Entities;

namespace ProjectApp.Core.Context
{
    public class SectionConfig : IEntityTypeConfiguration<Sections>
    {
        public void Configure(EntityTypeBuilder<Sections> builder)
        {
            builder.ToTable("Tbl_Sections");
            builder.HasKey(s => s.id);
            builder.Property(s => s.id).UseIdentityColumn();
            builder.Property(s => s.SectionName).IsRequired().HasMaxLength(100);
            builder.Property(s => s.ShortCode).IsRequired().HasMaxLength(3);
            builder.HasIndex(s => s.ShortCode).IsUnique();
            builder.Property(s => s.DepartmentId).IsRequired();
            builder.Property(s => s.IsActive).IsRequired();
            builder.Property(s => s.EntryDate).IsRequired();
            builder.Property(s => s.EntryBy).IsRequired();
            builder.Property(s => s.UpdateDate).IsRequired();
            builder.Property(s => s.UpdatedBy);
            builder.Property(s => s.IsDeleted);

            builder.HasOne(u => u.Department)
                .WithMany(u => u.Sections)
                .HasForeignKey(u => u.DepartmentId)
                .HasConstraintName("FK_Department_Sections");

            builder.HasOne(u => u.EntryUser)
                .WithMany()
                .HasForeignKey(u => u.EntryBy)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_Entry_section");

            builder.HasOne(u => u.UpdateUser)
                .WithMany()
                .HasForeignKey(u => u.UpdatedBy)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_Update_section");


        }
    }
}
