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
            CreateMap<UserDTO, CB_User>().ReverseMap();
            CreateMap<UserResDTO, CB_User>().ReverseMap();
        }

    }
}
