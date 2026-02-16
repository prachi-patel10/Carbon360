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

        public DbSet<Roles> Role { get; set; }
        public DbSet<Users> Users { get; set; }
        public DbSet<Workers> Worker { get; set; }

        public DbSet<Sections> Section { get; set; }
        public DbSet<Departments> Department { get; set; }
        
    }
}
