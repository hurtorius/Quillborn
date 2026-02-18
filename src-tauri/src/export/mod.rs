use std::fs;
use std::io::{Cursor, Write};
use std::path::PathBuf;

use zip::write::SimpleFileOptions;
use zip::ZipWriter;

use crate::manuscript::chapter::Chapter;
use crate::manuscript::project::{NodeType, Project, ProjectError};

fn collect_chapters_in_order(project: &Project) -> Result<Vec<Chapter>, ProjectError> {
    let mut chapters = Vec::new();

    fn walk_node(
        project: &Project,
        node_id: &str,
        chapters: &mut Vec<Chapter>,
    ) -> Result<(), ProjectError> {
        if let Some(node) = project.structure.nodes.get(node_id) {
            if node.node_type == NodeType::Chapter {
                let chapter_path = project
                    .path
                    .join("chapters")
                    .join(format!("{}.md", node_id));
                if chapter_path.exists() {
                    let chapter = Chapter::from_file(&chapter_path).map_err(|e| {
                        ProjectError::Io(std::io::Error::new(
                            std::io::ErrorKind::Other,
                            e.to_string(),
                        ))
                    })?;
                    chapters.push(chapter);
                }
            }
            for child_id in &node.children {
                walk_node(project, child_id, chapters)?;
            }
        }
        Ok(())
    }

    walk_node(project, &project.structure.root.clone(), &mut chapters)?;
    Ok(chapters)
}

pub fn export_markdown(project_path: String, output_path: String) -> Result<String, ProjectError> {
    let project = Project::open(&PathBuf::from(&project_path))?;
    let chapters = collect_chapters_in_order(&project)?;

    let mut output = String::new();
    output.push_str(&format!("# {}\n\n", project.metadata.title));
    if !project.metadata.author.is_empty() {
        output.push_str(&format!("*By {}*\n\n", project.metadata.author));
    }
    output.push_str("---\n\n");

    for chapter in &chapters {
        output.push_str(&format!("## {}\n\n", chapter.title));
        output.push_str(&chapter.content);
        output.push_str("\n\n---\n\n");
    }

    let out_path = PathBuf::from(&output_path);
    fs::write(&out_path, &output)?;

    Ok(out_path.display().to_string())
}

pub fn export_plain_text(
    project_path: String,
    output_path: String,
) -> Result<String, ProjectError> {
    let project = Project::open(&PathBuf::from(&project_path))?;
    let chapters = collect_chapters_in_order(&project)?;

    let mut output = String::new();
    output.push_str(&project.metadata.title.to_uppercase());
    output.push_str("\n");
    if !project.metadata.author.is_empty() {
        output.push_str(&format!("by {}", project.metadata.author));
    }
    output.push_str("\n\n");

    for chapter in &chapters {
        output.push_str(&chapter.title.to_uppercase());
        output.push_str("\n\n");
        // Strip markdown formatting for plain text
        let plain = strip_markdown(&chapter.content);
        output.push_str(&plain);
        output.push_str("\n\n");
    }

    let out_path = PathBuf::from(&output_path);
    fs::write(&out_path, &output)?;

    Ok(out_path.display().to_string())
}

fn strip_markdown(text: &str) -> String {
    let mut result = String::new();
    for line in text.lines() {
        let line = line.trim();
        // Remove heading markers
        let line = if line.starts_with('#') {
            line.trim_start_matches('#').trim()
        } else {
            line
        };
        // Remove bold/italic markers
        let line = line.replace("**", "").replace("__", "");
        let line = line.replace('*', "").replace('_', "");
        result.push_str(&line);
        result.push('\n');
    }
    result
}

/// Convert inline markdown formatting to HTML.
/// Handles: bold, italic, inline code, headings, blockquotes,
/// unordered lists, ordered lists, horizontal rules, and paragraphs.
fn markdown_to_html(text: &str) -> String {
    let mut html = String::new();
    let mut in_ul = false;
    let mut in_ol = false;
    let mut in_blockquote = false;
    let mut paragraph_buf: Vec<String> = Vec::new();

    let flush_paragraph = |buf: &mut Vec<String>, out: &mut String| {
        if !buf.is_empty() {
            let joined = buf.join("\n");
            let converted = inline_markdown_to_html(&joined);
            out.push_str(&format!("<p>{}</p>\n", converted));
            buf.clear();
        }
    };

    for line in text.lines() {
        let trimmed = line.trim();

        // Horizontal rule
        if trimmed == "---" || trimmed == "***" || trimmed == "___" {
            flush_paragraph(&mut paragraph_buf, &mut html);
            close_list_state(&mut in_ul, &mut in_ol, &mut in_blockquote, &mut html);
            html.push_str("<hr />\n");
            continue;
        }

        // Headings
        if trimmed.starts_with('#') {
            flush_paragraph(&mut paragraph_buf, &mut html);
            close_list_state(&mut in_ul, &mut in_ol, &mut in_blockquote, &mut html);
            let level = trimmed.chars().take_while(|c| *c == '#').count().min(6);
            let heading_text = trimmed[level..].trim();
            let converted = inline_markdown_to_html(heading_text);
            html.push_str(&format!("<h{}>{}</h{}>\n", level, converted, level));
            continue;
        }

        // Blockquote
        if trimmed.starts_with("> ") || trimmed == ">" {
            flush_paragraph(&mut paragraph_buf, &mut html);
            if in_ul {
                html.push_str("</ul>\n");
                in_ul = false;
            }
            if in_ol {
                html.push_str("</ol>\n");
                in_ol = false;
            }
            if !in_blockquote {
                html.push_str("<blockquote>\n");
                in_blockquote = true;
            }
            let quote_text = if trimmed == ">" {
                ""
            } else {
                trimmed[2..].trim()
            };
            let converted = inline_markdown_to_html(quote_text);
            html.push_str(&format!("<p>{}</p>\n", converted));
            continue;
        } else if in_blockquote {
            html.push_str("</blockquote>\n");
            in_blockquote = false;
        }

        // Unordered list item
        if trimmed.starts_with("- ") || trimmed.starts_with("* ") {
            flush_paragraph(&mut paragraph_buf, &mut html);
            if in_ol {
                html.push_str("</ol>\n");
                in_ol = false;
            }
            if !in_ul {
                html.push_str("<ul>\n");
                in_ul = true;
            }
            let item_text = trimmed[2..].trim();
            let converted = inline_markdown_to_html(item_text);
            html.push_str(&format!("<li>{}</li>\n", converted));
            continue;
        } else if in_ul && !trimmed.is_empty() {
            html.push_str("</ul>\n");
            in_ul = false;
        }

        // Ordered list item
        if let Some(rest) = parse_ordered_list_item(trimmed) {
            flush_paragraph(&mut paragraph_buf, &mut html);
            if in_ul {
                html.push_str("</ul>\n");
                in_ul = false;
            }
            if !in_ol {
                html.push_str("<ol>\n");
                in_ol = true;
            }
            let converted = inline_markdown_to_html(rest);
            html.push_str(&format!("<li>{}</li>\n", converted));
            continue;
        } else if in_ol && !trimmed.is_empty() {
            html.push_str("</ol>\n");
            in_ol = false;
        }

        // Empty line ends paragraph
        if trimmed.is_empty() {
            flush_paragraph(&mut paragraph_buf, &mut html);
            if in_ul {
                html.push_str("</ul>\n");
                in_ul = false;
            }
            if in_ol {
                html.push_str("</ol>\n");
                in_ol = false;
            }
            continue;
        }

        // Otherwise accumulate paragraph text
        paragraph_buf.push(trimmed.to_string());
    }

    // Flush remaining state
    flush_paragraph(&mut paragraph_buf, &mut html);
    close_list_state(&mut in_ul, &mut in_ol, &mut in_blockquote, &mut html);

    html
}

fn close_list_state(in_ul: &mut bool, in_ol: &mut bool, in_bq: &mut bool, html: &mut String) {
    if *in_ul {
        html.push_str("</ul>\n");
        *in_ul = false;
    }
    if *in_ol {
        html.push_str("</ol>\n");
        *in_ol = false;
    }
    if *in_bq {
        html.push_str("</blockquote>\n");
        *in_bq = false;
    }
}

/// Parse an ordered list item like "1. text" and return the text portion.
fn parse_ordered_list_item(line: &str) -> Option<&str> {
    let dot_pos = line.find(". ")?;
    let prefix = &line[..dot_pos];
    if prefix.chars().all(|c| c.is_ascii_digit()) && !prefix.is_empty() {
        Some(line[dot_pos + 2..].trim())
    } else {
        None
    }
}

/// Convert inline markdown (bold, italic, code) to HTML.
fn inline_markdown_to_html(text: &str) -> String {
    let text = html_escape(text);
    // Bold: **text** or __text__
    let text = replace_delimited(&text, "**", "<strong>", "</strong>");
    let text = replace_delimited(&text, "__", "<strong>", "</strong>");
    // Italic: *text* or _text_
    let text = replace_delimited(&text, "*", "<em>", "</em>");
    let text = replace_delimited(&text, "_", "<em>", "</em>");
    // Inline code: `text`
    let text = replace_delimited(&text, "`", "<code>", "</code>");
    text
}

fn html_escape(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

/// Replace pairs of a delimiter with open/close tags.
fn replace_delimited(text: &str, delimiter: &str, open: &str, close: &str) -> String {
    let mut result = String::new();
    let mut rest = text;
    let mut inside = false;

    while let Some(pos) = rest.find(delimiter) {
        result.push_str(&rest[..pos]);
        if inside {
            result.push_str(close);
        } else {
            result.push_str(open);
        }
        inside = !inside;
        rest = &rest[pos + delimiter.len()..];
    }
    result.push_str(rest);
    result
}

pub fn export_html(project_path: String, output_path: String) -> Result<String, ProjectError> {
    let project = Project::open(&PathBuf::from(&project_path))?;
    let chapters = collect_chapters_in_order(&project)?;

    let title = html_escape(&project.metadata.title);
    let author = html_escape(&project.metadata.author);

    let mut body = String::new();

    // Title page section
    body.push_str("    <header class=\"title-page\">\n");
    body.push_str(&format!("      <h1>{}</h1>\n", title));
    if !author.is_empty() {
        body.push_str(&format!("      <p class=\"author\">{}</p>\n", author));
    }
    body.push_str("    </header>\n\n");

    // Chapters
    for chapter in &chapters {
        let chapter_title = html_escape(&chapter.title);
        body.push_str("    <section class=\"chapter\">\n");
        body.push_str(&format!("      <h2>{}</h2>\n", chapter_title));
        let chapter_html = markdown_to_html(&chapter.content);
        // Indent the chapter content
        for line in chapter_html.lines() {
            body.push_str(&format!("      {}\n", line));
        }
        body.push_str("    </section>\n\n");
    }

    let html = format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <style>
    :root {{
      --bg: #fdf6ec;
      --fg: #3b2f1e;
      --accent: #8b5e3c;
      --muted: #c9b99a;
      --chapter-bg: #fefbf5;
    }}

    * {{
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }}

    body {{
      font-family: "Georgia", "Times New Roman", "Palatino Linotype", serif;
      background-color: var(--bg);
      color: var(--fg);
      line-height: 1.8;
      max-width: 42em;
      margin: 0 auto;
      padding: 2em 1.5em;
    }}

    .title-page {{
      text-align: center;
      padding: 4em 0 3em;
      border-bottom: 2px solid var(--muted);
      margin-bottom: 3em;
    }}

    .title-page h1 {{
      font-size: 2.4em;
      color: var(--accent);
      margin-bottom: 0.4em;
      letter-spacing: 0.02em;
    }}

    .title-page .author {{
      font-size: 1.2em;
      font-style: italic;
      color: var(--accent);
    }}

    .chapter {{
      margin-bottom: 3em;
      padding-bottom: 2em;
      border-bottom: 1px solid var(--muted);
    }}

    .chapter:last-child {{
      border-bottom: none;
    }}

    h2 {{
      font-size: 1.6em;
      color: var(--accent);
      margin-bottom: 1em;
      padding-bottom: 0.3em;
      border-bottom: 1px solid var(--muted);
    }}

    h3 {{ font-size: 1.3em; margin: 1.2em 0 0.6em; }}
    h4 {{ font-size: 1.1em; margin: 1em 0 0.5em; }}

    p {{
      margin-bottom: 1em;
      text-align: justify;
      text-indent: 1.5em;
    }}

    blockquote {{
      margin: 1.5em 0;
      padding: 0.8em 1.5em;
      border-left: 4px solid var(--accent);
      background-color: var(--chapter-bg);
      font-style: italic;
    }}

    blockquote p {{
      text-indent: 0;
      margin-bottom: 0.5em;
    }}

    ul, ol {{
      margin: 1em 0 1em 2em;
    }}

    li {{
      margin-bottom: 0.3em;
    }}

    hr {{
      border: none;
      border-top: 1px solid var(--muted);
      margin: 2em 0;
    }}

    code {{
      font-family: "Courier New", monospace;
      background: var(--chapter-bg);
      padding: 0.1em 0.3em;
      border-radius: 3px;
    }}

    strong {{
      font-weight: bold;
    }}

    em {{
      font-style: italic;
    }}

    @media print {{
      body {{
        background-color: #fff;
        color: #000;
        max-width: none;
        padding: 0;
      }}

      .title-page {{
        page-break-after: always;
      }}

      .chapter {{
        page-break-before: always;
        border-bottom: none;
      }}

      h2 {{
        color: #000;
        border-bottom-color: #999;
      }}

      blockquote {{
        background-color: #f5f5f5;
        border-left-color: #666;
      }}
    }}
  </style>
</head>
<body>
{body}</body>
</html>
"#,
        title = title,
        body = body,
    );

    let out_path = PathBuf::from(&output_path);
    fs::write(&out_path, &html)?;

    Ok(out_path.display().to_string())
}

/// Convert markdown content to LaTeX body text.
fn markdown_to_latex(text: &str) -> String {
    let mut latex = String::new();
    let mut in_quote = false;

    for line in text.lines() {
        let trimmed = line.trim();

        // Horizontal rules
        if trimmed == "---" || trimmed == "***" || trimmed == "___" {
            if in_quote {
                latex.push_str("\\end{quote}\n");
                in_quote = false;
            }
            latex.push_str("\\bigskip\\noindent\\rule{\\textwidth}{0.4pt}\\bigskip\n\n");
            continue;
        }

        // Headings
        if trimmed.starts_with('#') {
            if in_quote {
                latex.push_str("\\end{quote}\n");
                in_quote = false;
            }
            let level = trimmed.chars().take_while(|c| *c == '#').count();
            let heading_text = trimmed[level..].trim();
            let escaped = latex_escape(heading_text);
            let escaped = inline_markdown_to_latex(&escaped);
            match level {
                1 => latex.push_str(&format!("\\section{{{}}}\n\n", escaped)),
                2 => latex.push_str(&format!("\\subsection{{{}}}\n\n", escaped)),
                3 => latex.push_str(&format!("\\subsubsection{{{}}}\n\n", escaped)),
                _ => latex.push_str(&format!("\\paragraph{{{}}}\n\n", escaped)),
            }
            continue;
        }

        // Blockquote
        if trimmed.starts_with("> ") || trimmed == ">" {
            if !in_quote {
                latex.push_str("\\begin{quote}\n");
                in_quote = true;
            }
            let quote_text = if trimmed == ">" {
                ""
            } else {
                trimmed[2..].trim()
            };
            let escaped = latex_escape(quote_text);
            let escaped = inline_markdown_to_latex(&escaped);
            latex.push_str(&escaped);
            latex.push('\n');
            continue;
        } else if in_quote && trimmed.is_empty() {
            latex.push_str("\\end{quote}\n\n");
            in_quote = false;
            continue;
        } else if in_quote {
            latex.push_str("\\end{quote}\n");
            in_quote = false;
        }

        // Unordered list items
        if trimmed.starts_with("- ") || trimmed.starts_with("* ") {
            let item_text = trimmed[2..].trim();
            let escaped = latex_escape(item_text);
            let escaped = inline_markdown_to_latex(&escaped);
            latex.push_str(&format!("\\begin{{itemize}}\n\\item {}\n\\end{{itemize}}\n", escaped));
            continue;
        }

        // Ordered list items
        if let Some(rest) = parse_ordered_list_item(trimmed) {
            let escaped = latex_escape(rest);
            let escaped = inline_markdown_to_latex(&escaped);
            latex.push_str(&format!("\\begin{{enumerate}}\n\\item {}\n\\end{{enumerate}}\n", escaped));
            continue;
        }

        // Empty lines become paragraph breaks
        if trimmed.is_empty() {
            latex.push('\n');
            continue;
        }

        // Normal text
        let escaped = latex_escape(trimmed);
        let escaped = inline_markdown_to_latex(&escaped);
        latex.push_str(&escaped);
        latex.push('\n');
    }

    if in_quote {
        latex.push_str("\\end{quote}\n");
    }

    latex
}

/// Escape special LaTeX characters.
fn latex_escape(text: &str) -> String {
    text.replace('\\', "\\textbackslash{}")
        .replace('&', "\\&")
        .replace('%', "\\%")
        .replace('$', "\\$")
        .replace('#', "\\#")
        .replace('_', "\\_")
        .replace('{', "\\{")
        .replace('}', "\\}")
        .replace('~', "\\textasciitilde{}")
        .replace('^', "\\textasciicircum{}")
}

/// Convert inline markdown (bold, italic) to LaTeX commands.
fn inline_markdown_to_latex(text: &str) -> String {
    // Bold: **text** or __text__
    let text = replace_delimited(text, "**", "\\textbf{", "}");
    let text = replace_delimited(&text, "\\_\\_", "\\textbf{", "}");
    // Italic: *text* or _text_
    let text = replace_delimited(&text, "*", "\\emph{", "}");
    let text = replace_delimited(&text, "\\_", "\\emph{", "}");
    // Inline code: `text`
    let text = replace_delimited(&text, "`", "\\texttt{", "}");
    text
}

pub fn export_latex(project_path: String, output_path: String) -> Result<String, ProjectError> {
    let project = Project::open(&PathBuf::from(&project_path))?;
    let chapters = collect_chapters_in_order(&project)?;

    let title = latex_escape(&project.metadata.title);
    let author = latex_escape(&project.metadata.author);

    let mut body = String::new();

    body.push_str("\\begin{document}\n\n");
    body.push_str("\\maketitle\n");
    body.push_str("\\tableofcontents\n");
    body.push_str("\\newpage\n\n");

    for chapter in &chapters {
        let chapter_title = latex_escape(&chapter.title);
        body.push_str(&format!("\\chapter{{{}}}\n\n", chapter_title));
        let chapter_latex = markdown_to_latex(&chapter.content);
        body.push_str(&chapter_latex);
        body.push('\n');
    }

    body.push_str("\\end{document}\n");

    let latex = format!(
        r#"\documentclass[12pt]{{book}}

\usepackage[utf8]{{inputenc}}
\usepackage[T1]{{fontenc}}
\usepackage{{geometry}}
\usepackage{{setspace}}
\usepackage{{parskip}}

\geometry{{
  a4paper,
  margin=1in
}}

\onehalfspacing

\title{{{title}}}
\author{{{author}}}
\date{{}}

{body}"#,
        title = title,
        author = author,
        body = body,
    );

    let out_path = PathBuf::from(&output_path);
    fs::write(&out_path, &latex)?;

    Ok(out_path.display().to_string())
}

/// Escape text for safe inclusion in XML/XHTML content.
fn xml_escape(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

/// Convert markdown content to XHTML body suitable for EPUB chapters.
/// Similar to markdown_to_html but ensures valid XHTML (self-closing tags, etc.).
fn markdown_to_xhtml(text: &str) -> String {
    let mut xhtml = String::new();
    let mut in_ul = false;
    let mut in_ol = false;
    let mut in_blockquote = false;
    let mut paragraph_buf: Vec<String> = Vec::new();

    let flush_paragraph = |buf: &mut Vec<String>, out: &mut String| {
        if !buf.is_empty() {
            let joined = buf.join("\n");
            let converted = inline_markdown_to_xhtml(&joined);
            out.push_str(&format!("<p>{}</p>\n", converted));
            buf.clear();
        }
    };

    for line in text.lines() {
        let trimmed = line.trim();

        // Horizontal rule
        if trimmed == "---" || trimmed == "***" || trimmed == "___" {
            flush_paragraph(&mut paragraph_buf, &mut xhtml);
            close_list_state(&mut in_ul, &mut in_ol, &mut in_blockquote, &mut xhtml);
            xhtml.push_str("<hr />\n");
            continue;
        }

        // Headings
        if trimmed.starts_with('#') {
            flush_paragraph(&mut paragraph_buf, &mut xhtml);
            close_list_state(&mut in_ul, &mut in_ol, &mut in_blockquote, &mut xhtml);
            let level = trimmed.chars().take_while(|c| *c == '#').count().min(6);
            let heading_text = trimmed[level..].trim();
            let converted = inline_markdown_to_xhtml(heading_text);
            xhtml.push_str(&format!("<h{}>{}</h{}>\n", level, converted, level));
            continue;
        }

        // Blockquote
        if trimmed.starts_with("> ") || trimmed == ">" {
            flush_paragraph(&mut paragraph_buf, &mut xhtml);
            if in_ul {
                xhtml.push_str("</ul>\n");
                in_ul = false;
            }
            if in_ol {
                xhtml.push_str("</ol>\n");
                in_ol = false;
            }
            if !in_blockquote {
                xhtml.push_str("<blockquote>\n");
                in_blockquote = true;
            }
            let quote_text = if trimmed == ">" {
                ""
            } else {
                trimmed[2..].trim()
            };
            let converted = inline_markdown_to_xhtml(quote_text);
            xhtml.push_str(&format!("<p>{}</p>\n", converted));
            continue;
        } else if in_blockquote {
            xhtml.push_str("</blockquote>\n");
            in_blockquote = false;
        }

        // Unordered list item
        if trimmed.starts_with("- ") || trimmed.starts_with("* ") {
            flush_paragraph(&mut paragraph_buf, &mut xhtml);
            if in_ol {
                xhtml.push_str("</ol>\n");
                in_ol = false;
            }
            if !in_ul {
                xhtml.push_str("<ul>\n");
                in_ul = true;
            }
            let item_text = trimmed[2..].trim();
            let converted = inline_markdown_to_xhtml(item_text);
            xhtml.push_str(&format!("<li>{}</li>\n", converted));
            continue;
        } else if in_ul && !trimmed.is_empty() {
            xhtml.push_str("</ul>\n");
            in_ul = false;
        }

        // Ordered list item
        if let Some(rest) = parse_ordered_list_item(trimmed) {
            flush_paragraph(&mut paragraph_buf, &mut xhtml);
            if in_ul {
                xhtml.push_str("</ul>\n");
                in_ul = false;
            }
            if !in_ol {
                xhtml.push_str("<ol>\n");
                in_ol = true;
            }
            let converted = inline_markdown_to_xhtml(rest);
            xhtml.push_str(&format!("<li>{}</li>\n", converted));
            continue;
        } else if in_ol && !trimmed.is_empty() {
            xhtml.push_str("</ol>\n");
            in_ol = false;
        }

        // Empty line ends paragraph
        if trimmed.is_empty() {
            flush_paragraph(&mut paragraph_buf, &mut xhtml);
            if in_ul {
                xhtml.push_str("</ul>\n");
                in_ul = false;
            }
            if in_ol {
                xhtml.push_str("</ol>\n");
                in_ol = false;
            }
            continue;
        }

        // Otherwise accumulate paragraph text
        paragraph_buf.push(trimmed.to_string());
    }

    // Flush remaining state
    flush_paragraph(&mut paragraph_buf, &mut xhtml);
    close_list_state(&mut in_ul, &mut in_ol, &mut in_blockquote, &mut xhtml);

    xhtml
}

/// Convert inline markdown to XHTML (uses xml_escape instead of html_escape).
fn inline_markdown_to_xhtml(text: &str) -> String {
    let text = xml_escape(text);
    let text = replace_delimited(&text, "**", "<strong>", "</strong>");
    let text = replace_delimited(&text, "__", "<strong>", "</strong>");
    let text = replace_delimited(&text, "*", "<em>", "</em>");
    let text = replace_delimited(&text, "_", "<em>", "</em>");
    let text = replace_delimited(&text, "`", "<code>", "</code>");
    text
}

/// Generate a valid EPUB 3.0 file from the project.
pub fn export_epub(project_path: String, output_path: String) -> Result<String, ProjectError> {
    let project = Project::open(&PathBuf::from(&project_path))?;
    let chapters = collect_chapters_in_order(&project)?;

    let title = xml_escape(&project.metadata.title);
    let author = xml_escape(&project.metadata.author);

    let buf = Cursor::new(Vec::new());
    let mut zip = ZipWriter::new(buf);

    // 1. mimetype - MUST be first entry and stored uncompressed
    let stored_options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Stored);
    zip.start_file("mimetype", stored_options)
        .map_err(|e| ProjectError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;
    zip.write_all(b"application/epub+zip")
        .map_err(|e| ProjectError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;

    let deflated_options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    // 2. META-INF/container.xml
    let container_xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" />
  </rootfiles>
</container>"#;
    zip.start_file("META-INF/container.xml", deflated_options)
        .map_err(|e| ProjectError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;
    zip.write_all(container_xml.as_bytes())
        .map_err(|e| ProjectError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;

    // 3. OEBPS/style.css
    let style_css = r#"body {
  font-family: "Georgia", "Times New Roman", serif;
  line-height: 1.7;
  color: #2a2a2a;
  margin: 1em;
}
h1 {
  text-align: center;
  font-size: 2em;
  margin-bottom: 0.3em;
}
h2 {
  font-size: 1.5em;
  margin-top: 2em;
  margin-bottom: 1em;
}
p {
  margin-bottom: 0.8em;
  text-align: justify;
  text-indent: 1.5em;
}
.author {
  text-align: center;
  font-style: italic;
  color: #666;
  margin-bottom: 2em;
}
.title-page {
  text-align: center;
  padding-top: 30%;
}
blockquote {
  margin: 1em 2em;
  padding-left: 1em;
  border-left: 3px solid #999;
  font-style: italic;
}
blockquote p {
  text-indent: 0;
}
ul, ol {
  margin: 1em 0 1em 2em;
}
li {
  margin-bottom: 0.3em;
}
hr {
  border: none;
  border-top: 1px solid #ccc;
  margin: 2em 0;
}
code {
  font-family: "Courier New", monospace;
}
strong { font-weight: bold; }
em { font-style: italic; }
"#;
    zip.start_file("OEBPS/style.css", deflated_options)
        .map_err(|e| ProjectError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;
    zip.write_all(style_css.as_bytes())
        .map_err(|e| ProjectError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;

    // 4. OEBPS/title.xhtml
    let title_xhtml = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head>
  <meta charset="UTF-8" />
  <title>{title}</title>
  <link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
  <div class="title-page">
    <h1>{title}</h1>
    <p class="author">by {author}</p>
  </div>
</body>
</html>"#,
        title = title,
        author = author,
    );
    zip.start_file("OEBPS/title.xhtml", deflated_options)
        .map_err(|e| ProjectError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;
    zip.write_all(title_xhtml.as_bytes())
        .map_err(|e| ProjectError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;

    // 5. Chapter XHTML files
    for (i, chapter) in chapters.iter().enumerate() {
        let chap_num = i + 1;
        let chap_title = xml_escape(&chapter.title);
        let chap_body = markdown_to_xhtml(&chapter.content);

        let chap_xhtml = format!(
            r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head>
  <meta charset="UTF-8" />
  <title>{title}</title>
  <link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
  <h2>{title}</h2>
{body}</body>
</html>"#,
            title = chap_title,
            body = chap_body,
        );
        let filename = format!("OEBPS/chapter-{}.xhtml", chap_num);
        zip.start_file(&filename, deflated_options)
            .map_err(|e| ProjectError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;
        zip.write_all(chap_xhtml.as_bytes())
            .map_err(|e| ProjectError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;
    }

    // 6. OEBPS/nav.xhtml (EPUB 3 navigation document)
    let mut nav_items = String::new();
    nav_items.push_str("      <li><a href=\"title.xhtml\">Title Page</a></li>\n");
    for (i, chapter) in chapters.iter().enumerate() {
        let chap_num = i + 1;
        let chap_title = xml_escape(&chapter.title);
        nav_items.push_str(&format!(
            "      <li><a href=\"chapter-{}.xhtml\">{}</a></li>\n",
            chap_num, chap_title
        ));
    }

    let nav_xhtml = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Table of Contents</title>
  <link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
{items}    </ol>
  </nav>
</body>
</html>"#,
        items = nav_items,
    );
    zip.start_file("OEBPS/nav.xhtml", deflated_options)
        .map_err(|e| ProjectError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;
    zip.write_all(nav_xhtml.as_bytes())
        .map_err(|e| ProjectError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;

    // 7. OEBPS/toc.ncx (NCX for backward compatibility)
    let mut ncx_nav_points = String::new();
    ncx_nav_points.push_str(&format!(
        r#"    <navPoint id="title" playOrder="1">
      <navLabel><text>Title Page</text></navLabel>
      <content src="title.xhtml" />
    </navPoint>
"#
    ));
    for (i, chapter) in chapters.iter().enumerate() {
        let chap_num = i + 1;
        let play_order = i + 2;
        let chap_title = xml_escape(&chapter.title);
        ncx_nav_points.push_str(&format!(
            r#"    <navPoint id="chapter-{num}" playOrder="{order}">
      <navLabel><text>{title}</text></navLabel>
      <content src="chapter-{num}.xhtml" />
    </navPoint>
"#,
            num = chap_num,
            order = play_order,
            title = chap_title,
        ));
    }

    let toc_ncx = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="quillborn-{uid}" />
    <meta name="dtb:depth" content="1" />
    <meta name="dtb:totalPageCount" content="0" />
    <meta name="dtb:maxPageNumber" content="0" />
  </head>
  <docTitle>
    <text>{title}</text>
  </docTitle>
  <navMap>
{nav_points}  </navMap>
</ncx>"#,
        uid = uuid::Uuid::new_v4(),
        title = title,
        nav_points = ncx_nav_points,
    );
    zip.start_file("OEBPS/toc.ncx", deflated_options)
        .map_err(|e| ProjectError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;
    zip.write_all(toc_ncx.as_bytes())
        .map_err(|e| ProjectError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;

    // 8. OEBPS/content.opf (package document)
    let book_uid = uuid::Uuid::new_v4();

    let mut manifest_items = String::new();
    manifest_items.push_str("    <item id=\"style\" href=\"style.css\" media-type=\"text/css\" />\n");
    manifest_items.push_str("    <item id=\"nav\" href=\"nav.xhtml\" media-type=\"application/xhtml+xml\" properties=\"nav\" />\n");
    manifest_items.push_str("    <item id=\"ncx\" href=\"toc.ncx\" media-type=\"application/x-dtbncx+xml\" />\n");
    manifest_items.push_str("    <item id=\"title-page\" href=\"title.xhtml\" media-type=\"application/xhtml+xml\" />\n");
    for (i, _chapter) in chapters.iter().enumerate() {
        let chap_num = i + 1;
        manifest_items.push_str(&format!(
            "    <item id=\"chapter-{}\" href=\"chapter-{}.xhtml\" media-type=\"application/xhtml+xml\" />\n",
            chap_num, chap_num
        ));
    }

    let mut spine_items = String::new();
    spine_items.push_str("    <itemref idref=\"title-page\" />\n");
    for (i, _chapter) in chapters.iter().enumerate() {
        let chap_num = i + 1;
        spine_items.push_str(&format!("    <itemref idref=\"chapter-{}\" />\n", chap_num));
    }

    let content_opf = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">urn:uuid:{uid}</dc:identifier>
    <dc:title>{title}</dc:title>
    <dc:creator>{author}</dc:creator>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">{modified}</meta>
  </metadata>
  <manifest>
{manifest}  </manifest>
  <spine toc="ncx">
{spine}  </spine>
</package>"#,
        uid = book_uid,
        title = title,
        author = author,
        modified = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ"),
        manifest = manifest_items,
        spine = spine_items,
    );
    zip.start_file("OEBPS/content.opf", deflated_options)
        .map_err(|e| ProjectError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;
    zip.write_all(content_opf.as_bytes())
        .map_err(|e| ProjectError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;

    // Finalize the ZIP archive
    let cursor = zip.finish()
        .map_err(|e| ProjectError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;

    let out_path = PathBuf::from(&output_path);
    fs::write(&out_path, cursor.into_inner())?;

    Ok(out_path.display().to_string())
}
