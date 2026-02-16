namespace ProjectApp.Core.Entities
{
    public class Sections
    {
        public int id { get; set; }
        public string SectionName { get; set; }
        public string ShortCode { get; set; }
        public int DepartmentId { get; set; }
        public bool IsActive { get; set; }
        public DateTime EntryDate { get; set; }
        //UserId
        public int EntryBy { get; set; }
        public DateTime UpdateDate { get; set; }
        //UserId
        public int? UpdatedBy { get; set; }
        public bool IsDeleted { get; set; }

        public Users? EntryUser { get; set; }
        public Users? UpdateUser { get; set; }
        public Departments Department { get; set; }
    }
}
