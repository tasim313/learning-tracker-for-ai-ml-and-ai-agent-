import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

/**
 * Safe Markdown: raw HTML in the source is not rendered, unsafe URL schemes are
 * removed by react-markdown's default URL transform, and only https images load.
 * Supports GitHub-flavoured tables and lists, code, and $…$ / $$…$$ equations (KaTeX).
 */
const components: Components = {
  a: ({ href, children }) => {
    const external = typeof href === "string" && /^https?:\/\//.test(href);
    return <a href={href} className="font-medium text-blue-800 underline underline-offset-2" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{children}</a>;
  },
  img: ({ src, alt }) => typeof src === "string" && src.startsWith("https://")
    ? <img src={src} alt={alt ?? ""} loading="lazy" className="my-3 max-w-full rounded-lg border border-slate-200" />
    : <span className="text-xs text-slate-500">[image omitted: only https images are shown]</span>,
  table: ({ children }) => <div className="my-3 overflow-x-auto"><table className="min-w-full border-collapse text-sm">{children}</table></div>,
  th: ({ children }) => <th className="border border-slate-200 bg-slate-50 px-3 py-1.5 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-slate-200 px-3 py-1.5">{children}</td>,
  code: ({ className, children }) => <code className={`${className ?? ""} rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em] text-slate-800`}>{children}</code>,
  pre: ({ children }) => <pre className="my-3 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm [&_code]:bg-transparent [&_code]:p-0">{children}</pre>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-6">{children}</ol>,
  h1: ({ children }) => <h3 className="mt-4 text-lg font-semibold text-slate-900">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-4 text-base font-semibold text-slate-900">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-3 text-sm font-semibold text-slate-900">{children}</h4>,
  p: ({ children }) => <p className="my-2 leading-7">{children}</p>,
  blockquote: ({ children }) => <blockquote className="my-3 border-l-4 border-slate-300 pl-4 text-slate-600">{children}</blockquote>
};

export function Markdown({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div className={`text-sm text-slate-800 ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={components} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}
