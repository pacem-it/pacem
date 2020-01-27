using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Pacem.Mvc;
using Pacem.Mvc.Binary;
using Pacem.Mvc.Uploading;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Pacem.Js.CustomElements.Controllers
{
    [Route("pacem.js/[controller]")]
    public sealed class UploadController : Controller
    {
        private readonly IUploader _uploader;
        private readonly ILogger<UploadController> _logger;

        private ActionResult Error(Exception exc)
        {
            _logger.LogError(exc, exc.Message);
            return new StatusCodeResult(StatusCodes.Status500InternalServerError);
        }

        public UploadController(IUploader uploader, ILogger<UploadController> logger)
        {
            _uploader = uploader;
            _logger = logger;
        }

        [HttpPost]
        public async Task<object> Post([FromBody] Pacem.Mvc.Uploading.UploadRequest request)
        {
            switch (request?.Action)
            {
                case "start":
                    return await StartUploadAsync(request.Filename, request.Size, request.State);
                case "do":
                    var stream = request.Chunk;
                    byte[] buffer = Convert.FromBase64String(stream);
                    return await UploadAsync(request.Id, buffer, request.Position);
                case "undo":
                    return await UndoUploadAsync(request.Id);
            }
            return default(UploadResult);
        }

        async Task<ActionResult<UploadResult>> StartUploadAsync(string filename, long length, object state)
        {
            try
            {
                var upload = await _uploader.CreateUploadAsync(filename, length, state);
                return Ok(upload.ToResult());
            }
            catch (Exception exc)
            {
                return this.Error(exc);
            }
        }

        async Task<ActionResult<UploadResult>> UploadAsync(string uid, byte[] chunk, long position)
        {
            try
            {
                var upload = await _uploader.DoUploadAsync(uid, chunk, position);
                return Ok(upload.ToResult());
            }
            catch (Exception exc)
            {
                return this.Error(exc);
            }
        }

        async Task<ActionResult> UndoUploadAsync(string uid)
        {
            try
            {
                await _uploader.UndoUploadAsync(uid);
                return NoContent();
            }
            catch (Exception exc)
            {
                return this.Error(exc);
            }
        }

    }

}
