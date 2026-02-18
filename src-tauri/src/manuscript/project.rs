use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

use super::chapter::Chapter;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectMetadata {
    pub title: String,
    pub author: String,
    #[serde(default)]
    pub genre: String,
    #[serde(default)]
    pub word_count_target: Option<u64>,
    #[serde(default)]
    pub deadline: Option<String>,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ManuscriptNode {
    pub id: String,
    pub title: String,
    pub node_type: NodeType,
    pub children: Vec<String>,
    #[serde(default)]
    pub status: ChapterStatus,
    #[serde(default)]
    pub mood: Option<String>,
    #[serde(default)]
    pub pov: Option<String>,
    #[serde(default)]
    pub word_count: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum NodeType {
    Book,
    Part,
    Chapter,
    Scene,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ChapterStatus {
    #[default]
    Draft,
    Revised,
    Final,
    Trash,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ManuscriptStructure {
    pub root: String,
    pub nodes: HashMap<String, ManuscriptNode>,
    pub order: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    #[serde(skip)]
    pub path: PathBuf,
    pub metadata: ProjectMetadata,
    pub structure: ManuscriptStructure,
}

impl Project {
    pub fn create(dir: &Path, title: &str, author: &str) -> Result<Self, ProjectError> {
        let project_dir = dir.join(format!("{}.qb", sanitize_filename(title)));
        fs::create_dir_all(&project_dir)?;

        // Create subdirectories
        for sub in &[
            "chapters",
            "snapshots",
            "history",
            "notes/characters",
            "notes/locations",
            "notes/worldbuilding",
            "notes/scratch",
            "fonts",
            "sounds",
            "ghost-notes",
            "exports",
        ] {
            fs::create_dir_all(project_dir.join(sub))?;
        }

        let root_id = Uuid::new_v4().to_string();
        let now = Utc::now();

        let metadata = ProjectMetadata {
            title: title.to_string(),
            author: author.to_string(),
            genre: String::new(),
            word_count_target: None,
            deadline: None,
            created_at: now,
            modified_at: now,
        };

        let root_node = ManuscriptNode {
            id: root_id.clone(),
            title: title.to_string(),
            node_type: NodeType::Book,
            children: Vec::new(),
            status: ChapterStatus::Draft,
            mood: None,
            pov: None,
            word_count: 0,
        };

        let mut nodes = HashMap::new();
        nodes.insert(root_id.clone(), root_node);

        let structure = ManuscriptStructure {
            root: root_id,
            nodes,
            order: Vec::new(),
        };

        let project = Project {
            path: project_dir,
            metadata,
            structure,
        };

        project.save()?;
        Ok(project)
    }

    pub fn open(project_dir: &Path) -> Result<Self, ProjectError> {
        let manuscript_path = project_dir.join("manuscript.json");
        let metadata_path = project_dir.join("metadata.toml");

        if !manuscript_path.exists() {
            return Err(ProjectError::NotFound(
                manuscript_path.display().to_string(),
            ));
        }

        let structure: ManuscriptStructure =
            serde_json::from_str(&fs::read_to_string(&manuscript_path)?)?;

        let metadata: ProjectMetadata = if metadata_path.exists() {
            toml::from_str(&fs::read_to_string(&metadata_path)?)?
        } else {
            let now = Utc::now();
            ProjectMetadata {
                title: "Untitled".to_string(),
                author: String::new(),
                genre: String::new(),
                word_count_target: None,
                deadline: None,
                created_at: now,
                modified_at: now,
            }
        };

        Ok(Project {
            path: project_dir.to_path_buf(),
            metadata,
            structure,
        })
    }

    pub fn save(&self) -> Result<(), ProjectError> {
        let manuscript_json = serde_json::to_string_pretty(&self.structure)?;
        fs::write(self.path.join("manuscript.json"), manuscript_json)?;

        let metadata_toml = toml::to_string_pretty(&self.metadata)?;
        fs::write(self.path.join("metadata.toml"), metadata_toml)?;

        Ok(())
    }

    pub fn add_chapter(&mut self, title: &str, parent_id: Option<&str>) -> Result<Chapter, ProjectError> {
        let chapter = Chapter::new(title);
        let chapter_id = chapter.id.clone();

        let node = ManuscriptNode {
            id: chapter_id.clone(),
            title: title.to_string(),
            node_type: NodeType::Chapter,
            children: Vec::new(),
            status: ChapterStatus::Draft,
            mood: None,
            pov: None,
            word_count: 0,
        };

        self.structure.nodes.insert(chapter_id.clone(), node);
        self.structure.order.push(chapter_id.clone());

        let parent = parent_id.unwrap_or(&self.structure.root);
        if let Some(parent_node) = self.structure.nodes.get_mut(parent) {
            parent_node.children.push(chapter_id.clone());
        }

        // Write chapter file
        let chapter_path = self.path.join("chapters").join(chapter.filename());
        fs::write(&chapter_path, chapter.to_markdown())?;

        self.metadata.modified_at = Utc::now();
        self.save()?;

        Ok(chapter)
    }

    pub fn delete_chapter(&mut self, chapter_id: &str) -> Result<(), ProjectError> {
        // Remove from parent's children
        for node in self.structure.nodes.values_mut() {
            node.children.retain(|c| c != chapter_id);
        }

        // Remove from order
        self.structure.order.retain(|c| c != chapter_id);

        // Remove chapter file
        if self.structure.nodes.contains_key(chapter_id) {
            let filename = format!("{}.md", chapter_id);
            let chapter_path = self.path.join("chapters").join(&filename);
            if chapter_path.exists() {
                fs::remove_file(&chapter_path)?;
            }
        }

        self.structure.nodes.remove(chapter_id);
        self.metadata.modified_at = Utc::now();
        self.save()?;

        Ok(())
    }

    pub fn rename_chapter(&mut self, chapter_id: &str, new_title: &str) -> Result<(), ProjectError> {
        if let Some(node) = self.structure.nodes.get_mut(chapter_id) {
            node.title = new_title.to_string();
        } else {
            return Err(ProjectError::ChapterNotFound(chapter_id.to_string()));
        }

        // Update chapter file frontmatter
        let chapter_path = self.path.join("chapters").join(format!("{}.md", chapter_id));
        if chapter_path.exists() {
            let mut chapter = Chapter::from_file(&chapter_path)
                .map_err(|e| ProjectError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;
            chapter.title = new_title.to_string();
            fs::write(&chapter_path, chapter.to_markdown())?;
        }

        self.metadata.modified_at = Utc::now();
        self.save()?;

        Ok(())
    }

    pub fn reorder_chapters(&mut self, new_order: Vec<String>, parent_id: Option<&str>) -> Result<(), ProjectError> {
        let parent = parent_id.unwrap_or(&self.structure.root);
        if let Some(parent_node) = self.structure.nodes.get_mut(parent) {
            parent_node.children = new_order.clone();
        }
        self.structure.order = new_order;
        self.metadata.modified_at = Utc::now();
        self.save()?;
        Ok(())
    }

    pub fn create_snapshot(&self, name: Option<&str>) -> Result<String, ProjectError> {
        let now = Utc::now();
        let snapshot_name = name.unwrap_or("manual");
        let filename = format!("{}-{}.json", now.format("%Y-%m-%dT%H-%M-%S"), snapshot_name);

        let snapshot_dir = self.path.join("snapshots");
        fs::create_dir_all(&snapshot_dir)?;

        let snapshot = serde_json::json!({
            "timestamp": now,
            "name": snapshot_name,
            "structure": self.structure,
            "metadata": self.metadata,
        });

        fs::write(
            snapshot_dir.join(&filename),
            serde_json::to_string_pretty(&snapshot)?,
        )?;

        Ok(filename)
    }

    pub fn total_word_count(&self) -> u64 {
        self.structure.nodes.values().map(|n| n.word_count).sum()
    }
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' || c == ' ' { c } else { '_' })
        .collect::<String>()
        .trim()
        .to_string()
}

#[derive(Debug, thiserror::Error)]
pub enum ProjectError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("TOML serialization error: {0}")]
    TomlSer(#[from] toml::ser::Error),
    #[error("TOML deserialization error: {0}")]
    TomlDe(#[from] toml::de::Error),
    #[error("Project not found: {0}")]
    NotFound(String),
    #[error("Chapter not found: {0}")]
    ChapterNotFound(String),
}

impl serde::Serialize for ProjectError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
