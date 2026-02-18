use std::fs;
use std::path::PathBuf;

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
