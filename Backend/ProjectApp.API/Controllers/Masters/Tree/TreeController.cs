using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ProjectApp.Repository.Interfaces.Masters.Tree;

namespace ProjectApp.API.Controllers.Masters.Tree
{
    [Route("api/[controller]")]
    [ApiController]
    public class TreeController : ControllerBase
    {
        private readonly ITreeService _treeService;

        public TreeController(ITreeService treeService)
        {
            _treeService = treeService;
        }

        [HttpGet("All")]
        public async Task<IActionResult> GetAll()
        {
            var result = await _treeService.GetAllTreesAsync();
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var result = await _treeService.GetTreeByIdAsync(id);

            if (result == null)
                return NotFound("Tree not found");

            return Ok(result);
        }
    }
}
