using AutoMapper;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.User;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Services.Common
{
    public class BaseService<T> where T : class
    {
        protected readonly IMapper _mapper;
        protected readonly ICommonService<T> _commonService;
        protected readonly IUserContext _userContext;
        public BaseService(ICommonService<T> commonService, IMapper mapper, IUserContext userContext)
        {
            _mapper = mapper;
            _userContext = userContext;
            _commonService = commonService; 
        }
        protected int GetCurrentUserId()
        {
            return _userContext.UserId;
        }


    }
}
