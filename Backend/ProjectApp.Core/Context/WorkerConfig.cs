using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectApp.Core.Entities;

namespace ProjectApp.Core.Context
{
    public class WorkerConfig : IEntityTypeConfiguration<Workers>
    {
        public void Configure(EntityTypeBuilder<Workers> builder)
        {
            builder.ToTable("Workers");
            builder.HasKey(w => w.id);
            builder.Property(w => w.id).UseIdentityColumn();
            builder.Property(w => w.FullName).IsRequired().HasMaxLength(150);
            builder.Property(w => w.Age).IsRequired();
            builder.Property(w => w.Gender).IsRequired();
            builder.Property(w => w.EmpType).IsRequired().HasMaxLength(50);
            builder.Property(w => w.PhoneNumber).IsRequired().HasMaxLength(50);
            builder.Property(w => w.Department).IsRequired().HasMaxLength(50);
            builder.Property(w => w.CreatedAt).IsRequired();
            builder.Property(w => w.UpdatedAt).IsRequired();
            builder.Property(w => w.IsActive).IsRequired();
            builder.Property(w => w.UserId).IsRequired();

            builder.HasOne(w => w.User)
                .WithMany(u => u.Worker)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_User_Workers");


        }
    }
}
