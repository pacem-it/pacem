using Pacem.Js.CustomElements.Models;
using Pacem.Mvc.Uploading;
using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;

namespace Pacem.Js.CustomElements.Services
{

    public class UploadService : IUploader
    {
        private readonly ConcurrentDictionary<string, MockUpload> _ongoingDownloads = new ConcurrentDictionary<string, MockUpload>();

        public Task<IUpload> CreateUploadAsync(string filename, long length, object state)
        {
            MockUpload upload = new MockUpload(filename, length, state);
            _ongoingDownloads.TryAdd(upload.UniqueId, upload);
            return Task.FromResult(upload as IUpload);
        }

        public Task<IUpload> DoUploadAsync(string uid, byte[] chunk, long position)
        {
            if (_ongoingDownloads.TryGetValue(uid, out MockUpload upload))
            {
                // mimic I/O delays...
                Thread.Sleep(500);

                upload.Done = position + chunk.LongLength;
                if (upload.Complete)
                {
                    _ongoingDownloads.TryRemove(uid, out var _);
                }
            }
            return Task.FromResult(upload as IUpload);
        }

        public Task<string> GetDestinationFilenameAsync(string folder, string filename)
        => Task.FromResult(string.Empty);

        public Task SweepJunkFilesAsync(TimeSpan old)
            => Task.CompletedTask;

        public Task UndoUploadAsync(string uid)
        {
            _ongoingDownloads.TryRemove(uid, out var _);
            return Task.CompletedTask;
        }
    }
}
