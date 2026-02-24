using AutoMapper;
using ProjectApp.Core.DTOs.Account.Role;
using ProjectApp.Core.DTOs.Account.User;
using ProjectApp.Core.DTOs.Masters.Department;
using ProjectApp.Core.DTOs.Masters.Fuel;
using ProjectApp.Core.DTOs.Masters.Section;
using ProjectApp.Core.DTOs.Masters.VehicleType;
using ProjectApp.Core.DTOs.Worker;
using ProjectApp.Core.Entities;
using ProjectApp.Core.Models;
using System;

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
            CreateMap<CB_Department, DepartmentResponseDTO>()
     .ForMember(dest => dest.Id, opt => opt.Ignore());

            CreateMap<DepartmentCreateDTO, CB_Department>()
                .ForMember(dest => dest.DepartmentId, opt => opt.Ignore())
                .ForMember(dest => dest.IsDeleted, opt => opt.Ignore());

            CreateMap<DepartmentUpdateDTO, CB_Department>()
                .ForMember(dest => dest.DepartmentId, opt => opt.Ignore())
                .ForMember(dest => dest.IsDeleted, opt => opt.Ignore());

            CreateMap<CB_MasterFuelType, FuelResponseDTO>().ReverseMap();
            CreateMap<CB_MasterFuelType, FuelCreateUpdateDTO>().ReverseMap();

            CreateMap<CB_MasterVehicleType, VehicleTypeCreateDTO>().ReverseMap();
            CreateMap<CB_MasterVehicleType, VehicleTypeDTO>().ReverseMap();
            CreateMap<CB_MasterVehicleType, VehicleTypeResponseDTO>().ReverseMap();
            CreateMap<CB_MasterVehicleType, VehicleTypeUpdateDTO>().ReverseMap();

        }
    }
}
