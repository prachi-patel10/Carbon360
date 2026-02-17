using System;

using AutoMapper;
using ProjectApp.Core.DTOs.Account.Role;
using ProjectApp.Core.DTOs.Account.User;
using ProjectApp.Core.DTOs.Masters.Department;
using ProjectApp.Core.DTOs.Masters.Section;
using ProjectApp.Core.DTOs.Worker;
using ProjectApp.Core.Entities;

namespace ProjectApp.API.Extentions
{
    public class MapperConfig : Profile
    {
        public MapperConfig()
        {
            CreateMap<RoleDTO, Roles>().ReverseMap();
            CreateMap<UserDTO, Users>().ReverseMap();
            CreateMap<RegisterDTO, Users>().ReverseMap();
            CreateMap<WorkerDTO, Workers>().ReverseMap();
            CreateMap<SectionDTO, Sections>().ReverseMap();
            CreateMap<SectionViewDTO, Sections>().ReverseMap();
            CreateMap<DepartmentDTO, Departments>().ReverseMap();
        }

    }
}
