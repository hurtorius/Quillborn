use crate::manuscript::project::ProjectError;

#[tauri::command]
pub fn export_markdown(project_path: String, output_path: String) -> Result<String, ProjectError> {
    crate::export::export_markdown(project_path, output_path)
}

#[tauri::command]
pub fn export_plain_text(project_path: String, output_path: String) -> Result<String, ProjectError> {
    crate::export::export_plain_text(project_path, output_path)
}

#[tauri::command]
pub fn export_html(project_path: String, output_path: String) -> Result<String, ProjectError> {
    crate::export::export_html(project_path, output_path)
}

#[tauri::command]
pub fn export_latex(project_path: String, output_path: String) -> Result<String, ProjectError> {
    crate::export::export_latex(project_path, output_path)
}

#[tauri::command]
pub fn export_epub(project_path: String, output_path: String) -> Result<String, ProjectError> {
    crate::export::export_epub(project_path, output_path)
}
