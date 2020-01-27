using Pacem.Mvc.Uploading;

namespace Pacem.Js.CustomElements.Models
{
    public sealed class MockUpload : IUpload
    {
        public MockUpload(string filename, long length, object state = null)
        {
            UniqueId = KeyGenerator.GetStringIncremental(true);
            OriginalFilename = filename;
            Total = length;
            State = state;
            Filename = UniqueId + filename.Substring(filename.LastIndexOf('.'));
        }

        public bool Complete => this.Done >= this.Total;

        public string OriginalFilename { get; }

        public string Filename { get; }

        public string UniqueId { get; }

        public long Done { get; set; }

        public long Total { get; }

        public object State { get; }

        public string TemporaryFilePath => null;

        public string TargetFolder => null;
    }
}
