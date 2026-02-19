using System;

using AutoMapper;
using ProjectApp.Core.DTOs.Account.Role;
using ProjectApp.Core.DTOs.Account.User;
using ProjectApp.Core.DTOs.Masters.Department;
using ProjectApp.Core.DTOs.Masters.Section;
using ProjectApp.Core.DTOs.Worker;
using ProjectApp.Core.Entities;
using ProjectApp.Core.Models;

namespace ProjectApp.API.Extentions
{
    public class MapperConfig : Profile
    {
        public MapperConfig()
        {
            CreateMap<RoleDTO, CB_Role>().ReverseMap();
            CreateMap<RoleResponseDTO, CB_Role>().ReverseMap();
            CreateMap<UserDTO, CB_User>().ReverseMap();
            CreateMap<UserResDTO, CB_User>().ReverseMap();
            CreateMap<UserUpdateDTO, CB_User>().ReverseMap();
            CreateMap<CB_Department, DepartmentDTO>()
     .ForMember(dest => dest.Id,
                opt => opt.MapFrom(src => src.DepartmentId))
     .ReverseMap()
     .ForMember(dest => dest.DepartmentId,
                opt => opt.MapFrom(src => src.Id));

        }

    }
}
