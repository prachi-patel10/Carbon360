using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ProjectApp.Core.DTOs.Account.OffSet;
using ProjectApp.Repository.Interfaces.OffSet;

namespace ProjectApp.API.Controllers.OffSet
{
    [Route("api/[controller]")]
    [ApiController]
    public class FinalServiceController : ControllerBase
    {
        private readonly IFinalService _finalService;

        public FinalServiceController(IFinalService finalService)
        {
            _finalService = finalService;
        }

        [HttpGet("dropdown")]
        public async Task<IActionResult> GetUserProjects()
        {
            // 🔥 Get UserId from JWT / Logged-in user
            var userId = Convert.ToInt32(User.FindFirst("UserId")?.Value);

            var data = await _finalService.GetUserProjects(userId);

            return Ok(data);
        }

        [HttpPost("save-final")]
        public async Task<IActionResult> SaveFinalEntry([FromBody] FinalEntryDTO model)
        {
            if (model == null || model.Trees == null || model.Trees.Count == 0)
            {
                return BadRequest("Invalid data");
            }

            try
            {
                var result = await _finalService.SaveFinalEntry(model);

                return Ok(new
                {
                    message = "Final Entry Saved Successfully",
                    data = result
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }
    }
}
