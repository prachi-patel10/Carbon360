using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using pr.Repository.Services.Auth;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.Masters.Department;
using ProjectApp.Repository.Interfaces.Masters.Role;
using ProjectApp.Repository.Interfaces.User;
using ProjectApp.Repository.Services.Common;
using ProjectApp.Repository.Services.Masters.Department;
using ProjectApp.Repository.Services.Masters.Role;
using ProjectApp.Repository.Services.User;
using ProjectApp.Repository.Utilities.Auth;

namespace ProjectApp.API.Extentions
{
    public static class ServiceCollections
    {
        public static IServiceCollection AddProjectServices(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddScoped<ISPService>(sp =>
                new SPService(configuration.GetConnectionString("DbString"))
            );
            services.AddScoped<IAuthService, AuthService>();
            services.AddScoped<IDepartmentService, DepartmentService>();
            services.AddScoped<JWTService>();
            services.AddSingleton<IdEncoder>();
            services.AddScoped<IUserService, UserService>();
            services.AddScoped<IRoleService, RoleService>();
            services.AddScoped(typeof(ICommonService<>), typeof(CommonService<>));

            return services;
        }
    }
}
