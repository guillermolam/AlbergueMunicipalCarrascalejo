fn main() {
    println!("cargo:rerun-if-changed=src/");
    
    // WASM-specific build instructions
    if std::env::var("TARGET").unwrap_or_default().contains("wasm32") {
        println!("cargo:rustc-link-arg=--export=__wbindgen_malloc");
        println!("cargo:rustc-link-arg=--export=__wbindgen_realloc");
    }
}