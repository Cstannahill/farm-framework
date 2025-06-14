import React, { ReactNode, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ---------------------------------------------------------------------------
// Markdown → React component map
// ---------------------------------------------------------------------------
export const markdownComponents = {
  // -------------------------------------------------------------------------
  // Links
  // -------------------------------------------------------------------------
  a: ({
    href,
    children,
    title,
  }: {
    href?: string;
    children: ReactNode;
    title?: string;
  }) => {
    const isExternal = href ? /^(https?:)?\/\//.test(href) : false;
    const isEmail = href?.startsWith("mailto:");

    return (
      <motion.a
        href={href}
        title={title}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className="group relative inline-flex items-center gap-1 text-primary font-medium underline decoration-primary/30 underline-offset-4 transition-all duration-200 hover:decoration-primary hover:text-primary/80"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {children}
        {isExternal && (
          <svg
            className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        )}
        {isEmail && (
          <svg
            className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        )}
      </motion.a>
    );
  },

  // -------------------------------------------------------------------------
  // <pre> blocks -------------------------------------------------------------
  // -------------------------------------------------------------------------
  pre: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => {
    const [copied, setCopied] = useState(false);
    const preRef = useRef<HTMLPreElement>(null);
    const language = extractLanguage(className);

    const copyToClipboard = async () => {
      if (!preRef.current) return;
      try {
        const text = preRef.current.textContent || "";
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative my-4 rounded-xl border border-border bg-gradient-to-br from-muted/50 to-muted backdrop-blur-sm overflow-hidden shadow-lg"
      >
        {/* header: language label + copy button */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/80 border-b border-border/50">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            {language || "text"}
          </span>
          <motion.button
            onClick={copyToClipboard}
            className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-background/50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.svg
                  key="check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="w-3 h-3 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </motion.svg>
              ) : (
                <motion.svg
                  key="copy"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </motion.svg>
              )}
            </AnimatePresence>
            <span className="ml-1">{copied ? "Copied!" : "Copy"}</span>
          </motion.button>
        </div>

        <pre
          ref={preRef}
          className="overflow-x-auto p-4 text-sm leading-relaxed font-mono bg-transparent"
        >
          {children}
        </pre>
      </motion.div>
    );
  },

  // -------------------------------------------------------------------------
  // Inline code -------------------------------------------------------------
  // -------------------------------------------------------------------------
  code: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) return <code className={className}>{children}</code>;

    return (
      <motion.code
        className="relative inline-flex items-center px-2 py-1 mx-0.5 rounded-md bg-muted/70 text-sm font-mono text-foreground/90 border border-border/30 shadow-sm"
        whileHover={{ scale: 1.05, backgroundColor: "rgb(var(--muted) / 0.9)" }}
        transition={{ duration: 0.15 }}
      >
        {children}
      </motion.code>
    );
  },

  // -------------------------------------------------------------------------
  // Blockquote --------------------------------------------------------------
  // -------------------------------------------------------------------------
  blockquote: ({ children }: { children: ReactNode }) => (
    <motion.blockquote
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative my-4 pl-6 pr-4 py-3 border-l-4 border-primary bg-gradient-to-r from-primary/5 to-transparent rounded-r-lg"
    >
      <div className="absolute left-2 top-2 w-2 h-2 bg-primary rounded-full opacity-60" />
      <div className="text-muted-foreground italic leading-relaxed">
        {children}
      </div>
    </motion.blockquote>
  ),

  // -------------------------------------------------------------------------
  // Headings ----------------------------------------------------------------
  // -------------------------------------------------------------------------
  h1: ({ children, id }: { children: ReactNode; id?: string }) => (
    <motion.h1
      id={id}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative text-3xl font-bold text-foreground mt-8 mb-4 pb-2 border-b border-border/30"
    >
      {children}
      {id && (
        <a
          href={`#${id}`}
          className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity text-muted-foreground"
        >
          #
        </a>
      )}
    </motion.h1>
  ),

  h2: ({ children, id }: { children: ReactNode; id?: string }) => (
    <motion.h2
      id={id}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative text-2xl font-semibold text-foreground mt-6 mb-3"
    >
      {children}
      {id && (
        <a
          href={`#${id}`}
          className="absolute -left-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity text-muted-foreground text-lg"
        >
          #
        </a>
      )}
    </motion.h2>
  ),

  h3: ({ children, id }: { children: ReactNode; id?: string }) => (
    <motion.h3
      id={id}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative text-xl font-semibold text-foreground mt-5 mb-2"
    >
      {children}
      {id && (
        <a
          href={`#${id}`}
          className="absolute -left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity text-muted-foreground text-base"
        >
          #
        </a>
      )}
    </motion.h3>
  ),

  // -------------------------------------------------------------------------
  // Lists -------------------------------------------------------------------
  // -------------------------------------------------------------------------
  ul: ({ children }: { children: ReactNode }) => (
    <motion.ul
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="my-3 space-y-1 pl-6"
    >
      {children}
    </motion.ul>
  ),

  ol: ({ children }: { children: ReactNode }) => (
    <motion.ol
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="my-3 space-y-1 pl-6 list-decimal"
    >
      {children}
    </motion.ol>
  ),

  li: ({ children }: { children: ReactNode }) => (
    <motion.li
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative text-foreground/90 leading-relaxed before:content-['•'] before:absolute before:-left-4 before:text-primary before:font-bold"
    >
      {children}
    </motion.li>
  ),

  // -------------------------------------------------------------------------
  // Tables ------------------------------------------------------------------
  // -------------------------------------------------------------------------
  table: ({ children }: { children: ReactNode }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="my-4 overflow-hidden rounded-lg border border-border shadow-sm"
    >
      <table className="w-full border-collapse bg-background">{children}</table>
    </motion.div>
  ),

  thead: ({ children }: { children: ReactNode }) => (
    <thead className="bg-muted/50">{children}</thead>
  ),

  th: ({ children }: { children: ReactNode }) => (
    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">
      {children}
    </th>
  ),

  td: ({ children }: { children: ReactNode }) => (
    <td className="px-4 py-3 text-sm text-foreground/90 border-b border-border/30 last:border-b-0">
      {children}
    </td>
  ),

  // -------------------------------------------------------------------------
  // Paragraphs / horizontal rules ------------------------------------------
  // -------------------------------------------------------------------------
  p: ({ children }: { children: ReactNode }) => (
    <motion.p
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-3 text-foreground/90 leading-relaxed"
    >
      {children}
    </motion.p>
  ),

  hr: () => (
    <motion.hr
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      className="my-6 border-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
    />
  ),

  // -------------------------------------------------------------------------
  // Images ------------------------------------------------------------------
  // -------------------------------------------------------------------------
  img: ({
    src,
    alt,
    title,
  }: {
    src?: string;
    alt?: string;
    title?: string;
  }) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="my-4 relative overflow-hidden rounded-lg border border-border shadow-sm"
      >
        {!loaded && !error && (
          <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
            <svg
              className="w-8 h-8 text-muted-foreground animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <img
          src={src}
          alt={alt}
          title={title}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`w-full h-auto transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
        {error && (
          <div className="absolute inset-0 bg-muted/50 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <svg
                className="w-12 h-12 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 18.5C3.962 20.333 4.924 22 6.464 22z"
                />
              </svg>
              <p className="text-sm">Failed to load image</p>
            </div>
          </div>
        )}
      </motion.div>
    );
  },
};

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Extract language identifier from rehype/remark class string.
 */
export function extractLanguage(className?: string): string | null {
  if (!className) return null;
  const patterns = [
    /language-(\w+)/,
    /lang-(\w+)/,
    /highlight-(\w+)/,
    /code-(\w+)/,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(className);
    if (match) return match[1];
  }
  return null;
}

/**
 * Format content for display – trims, normalises newlines and whitespace.
 */
export function formatMessageContent(content: string): string {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .replace(/\n{3}/g, "\n\n")
    .replace(/[ \t]+$/gm, "")
    .trim();
}

/**
 * Generate a table‑of‑contents array from markdown source.
 */
export function generateTableOfContents(
  content: string
): Array<{ id: string; title: string; level: number }> {
  const headings: Array<{ id: string; title: string; level: number }> = [];
  content.split("\n").forEach((line) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const title = match[2].trim();
      const id = title
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");
      headings.push({ id, title, level });
    }
  });
  return headings;
}

/**
 * Very rough reading‑time estimate.
 */
export function estimateReadingTime(content: string): {
  minutes: number;
  words: number;
} {
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return { minutes, words };
}

/**
 * Ultra‑light sanitiser – **do not** rely on this for untrusted input in prod!
 */
export function sanitizeContent(content: string): string {
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "");
}

/**
 * Map shorthand language ids → highlight.js names.
 */
export const languageClassMap: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  jsx: "javascript",
  tsx: "typescript",
  py: "python",
  rb: "ruby",
  sh: "bash",
  yml: "yaml",
  md: "markdown",
  json: "json",
  html: "html",
  css: "css",
  sql: "sql",
  php: "php",
  cpp: "cpp",
  cs: "csharp",
  java: "java",
  go: "go",
  rs: "rust",
  kt: "kotlin",
  swift: "swift",
  dart: "dart",
  r: "r",
  scala: "scala",
  clj: "clojure",
  hs: "haskell",
  ml: "ocaml",
  fs: "fsharp",
  elm: "elm",
  ex: "elixir",
  erl: "erlang",
  nim: "nim",
  zig: "zig",
  v: "vlang",
  crystal: "crystal",
  d: "d",
  lua: "lua",
  perl: "perl",
  powershell: "powershell",
  dockerfile: "dockerfile",
  nginx: "nginx",
  apache: "apache",
  xml: "xml",
  toml: "toml",
  ini: "ini",
  cfg: "ini",
  conf: "apache",
  log: "log",
  diff: "diff",
  patch: "diff",
  gitignore: "gitignore",
  env: "bash",
  txt: "text",
};

/**
 * Normalise language id for syntax highlighter.
 */
export function getNormalizedLanguage(lang?: string): string {
  if (!lang) return "text";
  const normalized = lang.toLowerCase();
  return languageClassMap[normalized] || normalized;
}
