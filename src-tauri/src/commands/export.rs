use crate::manuscript::project::ProjectError;

#[tauri::command]
pub fn export_markdown(project_path: String, output_path: String) -> Result<String, ProjectError> {
    crate::export::export_markdown(project_path, output_path)
}

#[tauri::command]
pub fn export_plain_text(project_path: String, output_path: String) -> Result<String, ProjectError> {
    crate::export::export_plain_text(project_path, output_path)
}
