using Microsoft.AspNetCore.Hosting;
using System.Text;

namespace Pacem.Js.CustomElements.Services
{
    public class SeoService
    {
        private readonly IHostingEnvironment _env;

        public SeoService(IHostingEnvironment env)
        {
            _env = env;

        }

        public string ParseView(string package, string view)
        {
            string subPath = $"demo/{package}/{view}.html";
            var viewFile = _env.WebRootFileProvider.GetFileInfo(subPath);
            if (viewFile?.Exists != true)
            {
                return default(string);
            }
            using (var stream = viewFile.CreateReadStream())
            {
                var buffer = new byte[stream.Length];
                stream.Read(buffer, 0, buffer.Length);

                // normalize sparse dom
                string html = $"<html><body>{ Encoding.UTF8.GetString(buffer) }</body></html>";
                HtmlAgilityPack.HtmlDocument doc = new HtmlAgilityPack.HtmlDocument();
                doc.LoadHtml(html);

                // pick markdown containers
                var nodes = doc.DocumentNode.SelectNodes(@"//pre");

                StringBuilder sb = new StringBuilder();
                foreach (var node in nodes)
                {
                    string md = node.InnerText;
                    sb.AppendFormat("<div>{0}</div>", Markdig.Markdown.ToHtml(md));
                }

                return sb.ToString();
            }
        }
    }
}
