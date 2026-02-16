namespace ProjectApp.Core.DTOs.Masters.Section
{
    public class SectionViewDTO
    {
        public int Id { get; set; }
        public string SectionName { get; set; }
        public string ShortCode { get; set; }
        //public int DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public bool IsActive { get; set; }
    }
}
