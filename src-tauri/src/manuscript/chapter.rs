use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Chapter {
    pub id: String,
    pub title: String,
    pub content: String,
    pub status: String,
    #[serde(default)]
    pub mood: Option<String>,
    #[serde(default)]
    pub pov: Option<String>,
    pub word_count: u64,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
}

impl Chapter {
    pub fn new(title: &str) -> Self {
        let now = Utc::now();
        Chapter {
            id: Uuid::new_v4().to_string(),
            title: title.to_string(),
            content: String::new(),
            status: "draft".to_string(),
            mood: None,
            pov: None,
            word_count: 0,
            created_at: now,
            modified_at: now,
        }
    }

    pub fn filename(&self) -> String {
        format!("{}.md", self.id)
    }

    pub fn to_markdown(&self) -> String {
        let mut output = String::new();
        output.push_str("---\n");
        output.push_str(&format!("id: \"{}\"\n", self.id));
        output.push_str(&format!("title: \"{}\"\n", self.title));
        output.push_str(&format!("status: \"{}\"\n", self.status));
        if let Some(mood) = &self.mood {
            output.push_str(&format!("mood: \"{}\"\n", mood));
        }
        if let Some(pov) = &self.pov {
            output.push_str(&format!("pov: \"{}\"\n", pov));
        }
        output.push_str(&format!("word_count: {}\n", self.word_count));
        output.push_str(&format!("created_at: \"{}\"\n", self.created_at.to_rfc3339()));
        output.push_str(&format!(
            "modified_at: \"{}\"\n",
            self.modified_at.to_rfc3339()
        ));
        output.push_str("---\n\n");
        output.push_str(&self.content);
        output
    }

    pub fn from_file(path: &Path) -> Result<Self, ChapterError> {
        let raw = fs::read_to_string(path)?;
        Self::from_markdown(&raw, path)
    }

    pub fn from_markdown(raw: &str, path: &Path) -> Result<Self, ChapterError> {
        let id = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown")
            .to_string();

        if !raw.starts_with("---") {
            // Plain markdown without frontmatter
            let word_count = count_words(&raw);
            let now = Utc::now();
            return Ok(Chapter {
                id,
                title: path
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("Untitled")
                    .to_string(),
                content: raw.to_string(),
                status: "draft".to_string(),
                mood: None,
                pov: None,
                word_count: word_count as u64,
                created_at: now,
                modified_at: now,
            });
        }

        // Parse frontmatter
        let parts: Vec<&str> = raw.splitn(3, "---").collect();
        if parts.len() < 3 {
            let now = Utc::now();
            return Ok(Chapter {
                id,
                title: "Untitled".to_string(),
                content: raw.to_string(),
                status: "draft".to_string(),
                mood: None,
                pov: None,
                word_count: count_words(raw) as u64,
                created_at: now,
                modified_at: now,
            });
        }

        let frontmatter = parts[1].trim();
        let content = parts[2].trim().to_string();
        let word_count = count_words(&content);

        let mut title = "Untitled".to_string();
        let mut status = "draft".to_string();
        let mut mood = None;
        let mut pov = None;
        let mut created_at = Utc::now();
        let mut modified_at = Utc::now();

        for line in frontmatter.lines() {
            let line = line.trim();
            if let Some((key, value)) = line.split_once(':') {
                let key = key.trim();
                let value = value.trim().trim_matches('"');
                match key {
                    "id" => { /* use file-based id */ }
                    "title" => title = value.to_string(),
                    "status" => status = value.to_string(),
                    "mood" => mood = Some(value.to_string()),
                    "pov" => pov = Some(value.to_string()),
                    "created_at" => {
                        if let Ok(dt) = DateTime::parse_from_rfc3339(value) {
                            created_at = dt.with_timezone(&Utc);
                        }
                    }
                    "modified_at" => {
                        if let Ok(dt) = DateTime::parse_from_rfc3339(value) {
                            modified_at = dt.with_timezone(&Utc);
                        }
                    }
                    _ => {}
                }
            }
        }

        Ok(Chapter {
            id,
            title,
            content,
            status,
            mood,
            pov,
            word_count: word_count as u64,
            created_at,
            modified_at,
        })
    }

    pub fn update_content(&mut self, new_content: &str) {
        self.content = new_content.to_string();
        self.word_count = count_words(new_content) as u64;
        self.modified_at = Utc::now();
    }
}

pub fn count_words(text: &str) -> usize {
    text.split_whitespace().count()
}

#[derive(Debug, thiserror::Error)]
pub enum ChapterError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

impl serde::Serialize for ChapterError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
