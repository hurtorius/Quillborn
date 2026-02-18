use crate::manuscript::project::ProjectError;
use std::path::PathBuf;

#[derive(serde::Serialize)]
pub struct FontInfo {
    pub name: String,
    pub path: String,
    pub source: String, // "system" or "project"
}

#[tauri::command]
pub fn scan_fonts(project_path: Option<String>) -> Result<Vec<FontInfo>, ProjectError> {
    let mut fonts = Vec::new();

    // Scan system font directories
    let system_dirs = get_system_font_dirs();
    for dir in system_dirs {
        if let Ok(entries) = std::fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if is_font_file(&path) {
                    if let Some(name) = path.file_stem().and_then(|s| s.to_str()) {
                        fonts.push(FontInfo {
                            name: name.replace('-', " ").replace('_', " "),
                            path: path.display().to_string(),
                            source: "system".to_string(),
                        });
                    }
                }
            }
        }
    }

    // Scan project fonts directory
    if let Some(project_path) = project_path {
        let fonts_dir = PathBuf::from(&project_path).join("fonts");
        if fonts_dir.exists() {
            if let Ok(entries) = std::fs::read_dir(&fonts_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if is_font_file(&path) {
                        if let Some(name) = path.file_stem().and_then(|s| s.to_str()) {
                            fonts.push(FontInfo {
                                name: name.replace('-', " ").replace('_', " "),
                                path: path.display().to_string(),
                                source: "project".to_string(),
                            });
                        }
                    }
                }
            }
        }
    }

    // Sort by name
    fonts.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    // Deduplicate by name
    fonts.dedup_by(|a, b| a.name.to_lowercase() == b.name.to_lowercase());

    Ok(fonts)
}

fn get_system_font_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();

    #[cfg(target_os = "macos")]
    {
        dirs.push(PathBuf::from("/System/Library/Fonts"));
        dirs.push(PathBuf::from("/Library/Fonts"));
        if let Ok(home) = std::env::var("HOME") {
            dirs.push(PathBuf::from(home).join("Library/Fonts"));
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(windir) = std::env::var("WINDIR") {
            dirs.push(PathBuf::from(windir).join("Fonts"));
        }
        if let Ok(localappdata) = std::env::var("LOCALAPPDATA") {
            dirs.push(PathBuf::from(localappdata).join("Microsoft\\Windows\\Fonts"));
        }
    }

    #[cfg(target_os = "linux")]
    {
        dirs.push(PathBuf::from("/usr/share/fonts"));
        dirs.push(PathBuf::from("/usr/local/share/fonts"));
        if let Ok(home) = std::env::var("HOME") {
            dirs.push(PathBuf::from(&home).join(".fonts"));
            dirs.push(PathBuf::from(&home).join(".local/share/fonts"));
        }
    }

    dirs
}

fn is_font_file(path: &std::path::Path) -> bool {
    match path.extension().and_then(|e| e.to_str()) {
        Some(ext) => matches!(ext.to_lowercase().as_str(), "ttf" | "otf" | "woff" | "woff2"),
        None => false,
    }
}
