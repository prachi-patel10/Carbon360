using Microsoft.EntityFrameworkCore;
using ProjectApp.Core.DTOs.Masters.Section;
using ProjectApp.Core.Entities;

namespace ProjectApp.Core.Context
{
    public class ProjectDBContext : DbContext
    {
        public ProjectDBContext(DbContextOptions<ProjectDBContext> options) : base(options)
        {

        }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<SectionViewDTO>().HasNoKey();
        }

        public DbSet<Roles> Tbl_Role { get; set; }
        public DbSet<Users> Tbl_Users { get; set; }
        public DbSet<Workers> Tbl_Worker { get; set; }

        public DbSet<Sections> Tbl_Section { get; set; }
        public DbSet<Departments> Tbl_Department { get; set; }

    }
}
