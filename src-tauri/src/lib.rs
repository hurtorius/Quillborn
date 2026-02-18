mod commands;
mod export;
mod manuscript;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::manuscript::create_project,
            commands::manuscript::open_project,
            commands::manuscript::save_project,
            commands::manuscript::create_chapter,
            commands::manuscript::update_chapter,
            commands::manuscript::delete_chapter,
            commands::manuscript::rename_chapter,
            commands::manuscript::reorder_chapters,
            commands::manuscript::get_chapter_content,
            commands::manuscript::create_snapshot,
            commands::manuscript::get_project_state,
            commands::export::export_markdown,
            commands::export::export_plain_text,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Quillborn");
}
