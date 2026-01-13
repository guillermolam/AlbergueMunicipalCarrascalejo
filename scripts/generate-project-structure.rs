#!/usr/bin/env rust-script
//! ```cargo
//! [dependencies]
//! ignore = "0.4"
//! chrono = "0.4"
//! ```
//!
//! Generate Project Structure
//!
//! This Rust script walks the current Git repository (respecting .gitignore) and writes an ASCII tree to project-tree.txt.
//!
//! Prerequisites:
//! - Rust toolchain (install via https://rustup.rs/)
//! - rust-script (install with `cargo install rust-script`)
//!
//! Usage:
//! 1. Make executable: `chmod +x scripts/generate_project_structure.rs`
//! 2. Run from repo root: `./scripts/generate_project_structure.rs`

use chrono::Local;
use ignore::WalkBuilder;
use std::collections::BTreeMap;
use std::env;
use std::fs::File;
use std::io::{self, Write};
use std::path::PathBuf;

#[derive(Default)]
struct Node {
    children: BTreeMap<String, Node>,
    is_file: bool,
}

impl Node {
    fn insert(&mut self, rel_path: &PathBuf) {
        let comps: Vec<_> = rel_path.iter().collect();
        let mut current = self;
        for (i, comp_os) in comps.iter().enumerate() {
            let name = comp_os.to_string_lossy().to_string();
            let is_last = i + 1 == comps.len();
            current = current.children.entry(name).or_default();
            if is_last {
                current.is_file = true;
            }
        }
    }

    fn print<W: Write>(&self, prefix: &str, writer: &mut W) -> io::Result<()> {
        let len = self.children.len();
        for (idx, (name, node)) in self.children.iter().enumerate() {
            let is_last = idx + 1 == len;
            writeln!(
                writer,
                "{}{}{}",
                prefix,
                if is_last { "└── " } else { "├── " },
                name
            )?;
            let new_prefix = format!("{}{}", prefix, if is_last { "    " } else { "│   " });
            node.print(&new_prefix, writer)?;
        }
        Ok(())
    }
}

fn main() -> io::Result<()> {
    let root = env::current_dir()?;
    let mut tree = Node::default();

    // Walk the directory, filtering errors, respecting .gitignore
    for entry in WalkBuilder::new(&root)
        .hidden(true)
        .git_ignore(true)
        .git_exclude(true)
        .git_global(true)
        .build()
        .filter_map(Result::ok)
    {
        let path = entry.path();
        if path.is_file() {
            if let Ok(rel) = path.strip_prefix(&root) {
                tree.insert(&rel.to_path_buf());
            }
        }
    }

    let mut output = File::create("project-tree.txt")?;
    writeln!(output, "# 📂 Project Directory Tree (respects .gitignore)")?;
    writeln!(output, "# Generated on {}", Local::now().format("%c"))?;
    writeln!(output)?;
    writeln!(output, ".")?;
    tree.print("", &mut output)?;
    Ok(())
}
