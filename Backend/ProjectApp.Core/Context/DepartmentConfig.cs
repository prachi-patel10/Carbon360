using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectApp.Core.Entities;

namespace ProjectApp.Core.Context
{
    public class DepartmentConfig : IEntityTypeConfiguration<Departments>
    {
        public void Configure(EntityTypeBuilder<Departments> builder)
        {
            builder.ToTable("Tbl_Departments");
            builder.HasKey(d => d.id);
            builder.Property(d => d.id).UseIdentityColumn();
            builder.Property(d => d.DepartmentName).IsRequired().HasMaxLength(50);
            //builder.Property(d => d.CreatedAt).IsRequired();

            builder.HasData(new List<Departments>()
            {
                new Departments
                {
                    id = 1,
                    DepartmentName = "Human Resources",
                   
                },
                new Departments
                {
                    id = 2,
                    DepartmentName = "Finance",
                    //CreatedAt = DateTime.Now
                },
                new Departments
                {
                    id = 3,
                    DepartmentName = "IT",
                    //CreatedAt = DateTime.Now
                }
            }
            );
        }
    }
}
