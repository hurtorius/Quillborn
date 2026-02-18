use std::fs;
use std::path::PathBuf;

use crate::manuscript::chapter::Chapter;
use crate::manuscript::project::{Project, ProjectError};

#[derive(serde::Serialize)]
pub struct ProjectState {
    pub path: String,
    pub metadata: crate::manuscript::project::ProjectMetadata,
    pub structure: crate::manuscript::project::ManuscriptStructure,
    pub total_word_count: u64,
}

#[tauri::command]
pub fn create_project(
    dir: String,
    title: String,
    author: String,
) -> Result<ProjectState, ProjectError> {
    let project = Project::create(&PathBuf::from(&dir), &title, &author)?;
    let state = ProjectState {
        path: project.path.display().to_string(),
        metadata: project.metadata.clone(),
        structure: project.structure.clone(),
        total_word_count: project.total_word_count(),
    };
    Ok(state)
}

#[tauri::command]
pub fn open_project(path: String) -> Result<ProjectState, ProjectError> {
    let project = Project::open(&PathBuf::from(&path))?;

    // Load word counts from chapter files
    let state = ProjectState {
        path: project.path.display().to_string(),
        metadata: project.metadata.clone(),
        structure: project.structure.clone(),
        total_word_count: project.total_word_count(),
    };
    Ok(state)
}

#[tauri::command]
pub fn save_project(path: String) -> Result<(), ProjectError> {
    let project = Project::open(&PathBuf::from(&path))?;
    project.save()?;
    Ok(())
}

#[tauri::command]
pub fn create_chapter(
    project_path: String,
    title: String,
    parent_id: Option<String>,
) -> Result<Chapter, ProjectError> {
    let mut project = Project::open(&PathBuf::from(&project_path))?;
    let chapter = project.add_chapter(&title, parent_id.as_deref())?;
    Ok(chapter)
}

#[tauri::command]
pub fn update_chapter(
    project_path: String,
    chapter_id: String,
    content: String,
) -> Result<u64, ProjectError> {
    let mut project = Project::open(&PathBuf::from(&project_path))?;
    let chapter_path = project
        .path
        .join("chapters")
        .join(format!("{}.md", chapter_id));

    if !chapter_path.exists() {
        return Err(ProjectError::ChapterNotFound(chapter_id));
    }

    let mut chapter = Chapter::from_file(&chapter_path)
        .map_err(|e| ProjectError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;

    chapter.update_content(&content);
    let word_count = chapter.word_count;

    fs::write(&chapter_path, chapter.to_markdown())?;

    // Update word count in structure
    if let Some(node) = project.structure.nodes.get_mut(&chapter_id) {
        node.word_count = word_count;
    }
    project.save()?;

    Ok(word_count)
}

#[tauri::command]
pub fn delete_chapter(project_path: String, chapter_id: String) -> Result<(), ProjectError> {
    let mut project = Project::open(&PathBuf::from(&project_path))?;
    project.delete_chapter(&chapter_id)?;
    Ok(())
}

#[tauri::command]
pub fn rename_chapter(
    project_path: String,
    chapter_id: String,
    new_title: String,
) -> Result<(), ProjectError> {
    let mut project = Project::open(&PathBuf::from(&project_path))?;
    project.rename_chapter(&chapter_id, &new_title)?;
    Ok(())
}

#[tauri::command]
pub fn reorder_chapters(
    project_path: String,
    new_order: Vec<String>,
    parent_id: Option<String>,
) -> Result<(), ProjectError> {
    let mut project = Project::open(&PathBuf::from(&project_path))?;
    project.reorder_chapters(new_order, parent_id.as_deref())?;
    Ok(())
}

#[tauri::command]
pub fn get_chapter_content(
    project_path: String,
    chapter_id: String,
) -> Result<Chapter, ProjectError> {
    let project_dir = PathBuf::from(&project_path);
    let chapter_path = project_dir.join("chapters").join(format!("{}.md", chapter_id));

    if !chapter_path.exists() {
        return Err(ProjectError::ChapterNotFound(chapter_id));
    }

    let chapter = Chapter::from_file(&chapter_path)
        .map_err(|e| ProjectError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;

    Ok(chapter)
}

#[tauri::command]
pub fn create_snapshot(
    project_path: String,
    name: Option<String>,
) -> Result<String, ProjectError> {
    let project = Project::open(&PathBuf::from(&project_path))?;
    let filename = project.create_snapshot(name.as_deref())?;
    Ok(filename)
}

#[tauri::command]
pub fn get_project_state(project_path: String) -> Result<ProjectState, ProjectError> {
    let project = Project::open(&PathBuf::from(&project_path))?;
    let state = ProjectState {
        path: project.path.display().to_string(),
        metadata: project.metadata.clone(),
        structure: project.structure.clone(),
        total_word_count: project.total_word_count(),
    };
    Ok(state)
}
