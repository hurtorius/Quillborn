use crate::manuscript::project::{Project, ProjectError};
use std::path::PathBuf;

#[derive(serde::Serialize)]
pub struct SearchResult {
    pub chapter_id: String,
    pub chapter_title: String,
    pub matches: Vec<SearchMatch>,
}

#[derive(serde::Serialize)]
pub struct SearchMatch {
    pub line_number: usize,
    pub line_content: String,
    pub start: usize,
    pub end: usize,
}

#[tauri::command]
pub fn search_manuscript(
    project_path: String,
    query: String,
    case_sensitive: Option<bool>,
) -> Result<Vec<SearchResult>, ProjectError> {
    let project = Project::open(&PathBuf::from(&project_path))?;
    let case_sensitive = case_sensitive.unwrap_or(false);
    let mut results = Vec::new();

    for (id, node) in &project.structure.nodes {
        if node.node_type != crate::manuscript::project::NodeType::Chapter {
            continue;
        }
        let chapter_path = project.path.join("chapters").join(format!("{}.md", id));
        if !chapter_path.exists() {
            continue;
        }
        let content = std::fs::read_to_string(&chapter_path).unwrap_or_default();
        // Skip frontmatter
        let text = if content.starts_with("---") {
            content.splitn(3, "---").nth(2).unwrap_or("").to_string()
        } else {
            content
        };

        let mut matches = Vec::new();
        for (line_idx, line) in text.lines().enumerate() {
            let (search_line, search_query) = if case_sensitive {
                (line.to_string(), query.clone())
            } else {
                (line.to_lowercase(), query.to_lowercase())
            };

            let mut start = 0;
            while let Some(pos) = search_line[start..].find(&search_query) {
                let abs_pos = start + pos;
                matches.push(SearchMatch {
                    line_number: line_idx + 1,
                    line_content: line.to_string(),
                    start: abs_pos,
                    end: abs_pos + query.len(),
                });
                start = abs_pos + 1;
            }
        }

        if !matches.is_empty() {
            results.push(SearchResult {
                chapter_id: id.clone(),
                chapter_title: node.title.clone(),
                matches,
            });
        }
    }

    Ok(results)
}
