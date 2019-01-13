using Microsoft.AspNetCore.Mvc;
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
        private readonly IUploader uploader;
        private readonly IBinaryResolver binaryResolver;
        private readonly IBinaryProvider binaryProvider;

        public UploadController(IUploader uploader, IBinaryResolver binaryResolver, IBinaryProvider binaryProvider)
        {
            this.uploader = uploader;
            this.binaryResolver = binaryResolver;
            this.binaryProvider = binaryProvider;
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

        async Task<ApiResult<UploadResult>> StartUploadAsync(string filename, long length, object state)
        {
            try
            {
                var upload = await uploader.CreateUploadAsync(filename, length, state);
                return ApiResult.FromResult(upload.ToResult());
            }
            catch (Exception exc)
            {
                return ApiResult.FromErrors(exc.Message);
            }
        }

        async Task<ApiResult<UploadResult>> UploadAsync(string uid, byte[] chunk, long position)
        {
            try
            {
                var upload = await uploader.DoUploadAsync(uid, chunk, position);
                if (upload.Complete)
                    await binaryProvider.SaveFileAsync(this.HttpContext.GetWebsite().Id, upload);
                return ApiResult.FromResult(upload.ToResult());
            }
            catch (Exception exc)
            {
                return ApiResult.FromErrors(exc.Message);
            }
        }

        async Task<ApiResult> UndoUploadAsync(string uid)
        {
            try
            {
                await uploader.UndoUploadAsync(uid);
                return ApiResult.Success;
            }
            catch (Exception exc)
            {
                return ApiResult.FromErrors(exc.Message);
            }
        }

        [HttpGet]
        public async Task<object> Get(string type, string q, int skip, int take)
        {
            var pictureSet = await binaryProvider.GetPictureSetAsync(HttpContext.GetWebsite().Id, "en-us", q, skip, take);
            return new
            {
                success = true,
                result = new
                {
                    // these are the properties expected by the <pacem-edit> component
                    total = pictureSet.Total,
                    skip = pictureSet.Index,
                    take = pictureSet.Size,
                    set = pictureSet.Set.Select(p => new
                    {
                        id = p.Uid,
                        thumb = Url.Binary(BinaryType.Picture, p.ThumbnailFilename),
                        src = Url.Binary(BinaryType.Picture, p.Filename),
                        caption = p.Caption
                    })
                }
            };
        }
    }

}
