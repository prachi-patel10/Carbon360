using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ProjectApp.Core.DTOs.Account.OffSet;
using ProjectApp.Repository.Interfaces.OffSet;

namespace ProjectApp.API.Controllers.OffSet
{
    [Route("api/[controller]")]
    [ApiController]
    public class AbsorptionEntryController : ControllerBase
    {
        private readonly IAbsorptionEntry _service;

            public AbsorptionEntryController(IAbsorptionEntry service)
            {
                _service = service;
            }
        [HttpPost("save")]
        public async Task<IActionResult> Save([FromBody] AbsorptionEntryInsertDTO request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _service.InsertAsync(request);

            if (!result.Success)
                return BadRequest(result);

            return Ok(result);
        }

    }
}

