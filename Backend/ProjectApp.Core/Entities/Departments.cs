namespace ProjectApp.Core.Entities
{
    public class Departments
    {
        public int id { get; set; }
        public string DepartmentName
        {
            get; set;
        }

        public ICollection<Sections> Sections { get; set; }
        //public DateTime CreatedAt { get; set; }

    }
}
