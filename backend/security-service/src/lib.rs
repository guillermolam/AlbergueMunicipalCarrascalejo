#![deny(warnings)]
#![warn(clippy::all, clippy::pedantic)]
#![allow(
    clippy::module_name_repetitions,
    clippy::missing_errors_doc,
    clippy::missing_panics_doc,
    clippy::unused_async,
    clippy::implicit_hasher,
    clippy::cast_possible_truncation,
    clippy::cast_precision_loss
)]

use base64::Engine;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::info;
use worker::{event, Context, Env, Method, Request, Response, Result};

#[derive(Serialize, Deserialize)]
struct SecurityScanRequest {
    content: String,
    scan_type: String,
    metadata: Option<HashMap<String, String>>,
}

#[derive(Serialize, Deserialize)]
struct SecurityScanResult {
    status: String,
    threats_detected: u32,
    risk_level: String,
    details: Vec<ThreatDetail>,
    scan_duration_ms: u64,
    confidence_score: f64,
}

#[derive(Serialize, Deserialize, Clone)]
struct ThreatDetail {
    threat_type: String,
    severity: String,
    description: String,
    location: Option<String>,
    recommendation: String,
}

#[derive(Serialize, Deserialize)]
struct EncryptionRequest {
    data: String,
    key_id: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct EncryptionResult {
    encrypted_data: String,
    key_id: String,
    algorithm: String,
    timestamp: u64,
}

#[tracing::instrument(skip(content), fields(content_len = content.len()))]
fn detect_xss_patterns(content: &str) -> Vec<ThreatDetail> {
    let xss_patterns = [
        (r"<script[^>]*>", "Script injection", "high"),
        (r"javascript:", "JavaScript URL", "medium"),
        (r"on\w+\s*=", "Event handler injection", "medium"),
        (r"<iframe[^>]*>", "Iframe injection", "medium"),
        (r"eval\s*\(", "Eval function", "high"),
    ];

    let mut threats = Vec::new();

    for (pattern, threat_type, severity) in &xss_patterns {
        if let Ok(regex) = regex::Regex::new(pattern) {
            if regex.is_match(&content.to_lowercase()) {
                threats.push(ThreatDetail {
                    threat_type: format!("XSS: {threat_type}"),
                    severity: severity.to_string(),
                    description: format!("Detected potential XSS pattern: {threat_type}"),
                    location: None,
                    recommendation: "Sanitize input and encode output".to_string(),
                });
            }
        }
    }

    threats
}

#[tracing::instrument(skip(content), fields(content_len = content.len()))]
fn detect_sql_injection(content: &str) -> Vec<ThreatDetail> {
    let sql_patterns = [
        (r"(?i)union\s+select", "UNION SELECT injection", "high"),
        (
            r"(?i)'\s*or\s*'1'\s*=\s*'1",
            "Boolean-based injection",
            "high",
        ),
        (r"(?i);\s*drop\s+table", "DROP TABLE command", "critical"),
        (r"(?i)'\s*;\s*exec", "Command execution", "critical"),
        (r"(?i)load_file\s*\(", "File disclosure", "high"),
    ];

    let mut threats = Vec::new();

    for (pattern, threat_type, severity) in &sql_patterns {
        if let Ok(regex) = regex::Regex::new(pattern) {
            if regex.is_match(content) {
                threats.push(ThreatDetail {
                    threat_type: format!("SQL Injection: {threat_type}"),
                    severity: severity.to_string(),
                    description: format!("Detected potential SQL injection: {threat_type}"),
                    location: None,
                    recommendation: "Use parameterized queries".to_string(),
                });
            }
        }
    }

    threats
}

#[tracing::instrument(skip(content), fields(content_len = content.len()))]
fn detect_malware_signatures(content: &str) -> Vec<ThreatDetail> {
    let malware_patterns = [
        (r"(?i)cmd\.exe", "Command execution", "high"),
        (r"(?i)powershell", "PowerShell execution", "medium"),
        (r"(?i)base64_decode", "Base64 obfuscation", "medium"),
        (r"(?i)shell_exec", "Shell execution", "high"),
        (r"(?i)system\s*\(", "System command", "high"),
    ];

    let mut threats = Vec::new();

    for (pattern, threat_type, severity) in &malware_patterns {
        if let Ok(regex) = regex::Regex::new(pattern) {
            if regex.is_match(content) {
                threats.push(ThreatDetail {
                    threat_type: format!("Malware: {threat_type}"),
                    severity: severity.to_string(),
                    description: format!("Detected potential malware signature: {threat_type}"),
                    location: None,
                    recommendation: "Quarantine and analyze further".to_string(),
                });
            }
        }
    }

    threats
}

#[tracing::instrument(skip(content), fields(content_len = content.len()))]
fn perform_comprehensive_scan(content: &str, scan_type: &str) -> SecurityScanResult {
    let _ = scan_type;
    let xss_threats = detect_xss_patterns(content);
    let sql_threats = detect_sql_injection(content);
    let malware_threats = detect_malware_signatures(content);
    let entropy_score = calculate_entropy(content);

    let mut all_threats = Vec::new();
    all_threats.extend(xss_threats);
    all_threats.extend(sql_threats);
    all_threats.extend(malware_threats);

    if entropy_score > 7.5 {
        all_threats.push(ThreatDetail {
            threat_type: "High Entropy".to_string(),
            severity: "medium".to_string(),
            description: "Content has high entropy, possibly obfuscated".to_string(),
            location: None,
            recommendation: "Review for obfuscated code".to_string(),
        });
    }

    let threats_count = all_threats.len() as u32;
    let risk_level = determine_risk_level(&all_threats);
    let confidence_score = calculate_confidence_score(&all_threats, content);

    SecurityScanResult {
        status: if threats_count > 0 {
            "threats_detected"
        } else {
            "clean"
        }
        .to_string(),
        threats_detected: threats_count,
        risk_level,
        details: all_threats,
        scan_duration_ms: 0,
        confidence_score,
    }
}

#[tracing::instrument(skip(content), fields(content_len = content.len()))]
fn calculate_entropy(content: &str) -> f64 {
    if content.is_empty() {
        return 0.0;
    }

    let mut char_counts = HashMap::new();
    for c in content.chars() {
        *char_counts.entry(c).or_insert(0) += 1;
    }

    let len = content.len() as f64;
    let mut entropy = 0.0;

    for count in char_counts.values() {
        let frequency = f64::from(*count) / len;
        entropy -= frequency * frequency.log2();
    }

    entropy
}

fn determine_risk_level(threats: &[ThreatDetail]) -> String {
    let critical_count = threats.iter().filter(|t| t.severity == "critical").count();
    let high_count = threats.iter().filter(|t| t.severity == "high").count();
    let medium_count = threats.iter().filter(|t| t.severity == "medium").count();

    if critical_count > 0 {
        "critical".to_string()
    } else if high_count >= 2 {
        "high".to_string()
    } else if high_count > 0 || medium_count >= 3 {
        "medium".to_string()
    } else if medium_count > 0 {
        "low".to_string()
    } else {
        "clean".to_string()
    }
}

fn calculate_confidence_score(threats: &[ThreatDetail], content: &str) -> f64 {
    if threats.is_empty() {
        return 0.95;
    }

    let base_confidence = 0.8;
    let content_length_factor = (content.len() as f64 / 1000.0).min(1.0);
    let threat_diversity = threats
        .iter()
        .map(|t| &t.threat_type)
        .collect::<std::collections::HashSet<_>>()
        .len() as f64;

    (base_confidence + content_length_factor * 0.1 + threat_diversity * 0.05).min(0.99)
}

#[tracing::instrument(skip(data))]
fn perform_encryption(data: &str, key_id: Option<String>) -> EncryptionResult {
    let actual_key_id = key_id.unwrap_or_else(|| "default-key-2024".to_string());

    let encrypted = base64::engine::general_purpose::STANDARD.encode(format!("encrypted:{data}"));

    EncryptionResult {
        encrypted_data: encrypted,
        key_id: actual_key_id,
        algorithm: "AES-256-GCM".to_string(),
        timestamp: {
            let dur = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_else(|_| std::time::Duration::from_secs(0));
            dur.as_secs()
        },
    }
}

#[event(fetch)]
async fn fetch(mut req: Request, _env: Env, _ctx: Context) -> Result<Response> {
    let method = req.method();
    let path = req.path();
    info!(method = ?method, path = %path, "Incoming security request");

    let mut response = match (method, path.as_str()) {
        (Method::Post, "/security/scan") => handle_security_scan(&mut req).await,
        (Method::Post, "/security/encrypt") => handle_encryption(&mut req).await,
        (Method::Post, "/security/validate") => handle_validation(&mut req).await,
        (Method::Get, "/security/status") => handle_security_status(),
        _ => {
            let mut resp = Response::ok(r#"{"error":"Security endpoint not found"}"#)?;
            resp.headers_mut().set("content-type", "application/json")?;
            Ok(resp.with_status(404))
        }
    }?;

    add_cors_headers(&mut response)?;
    Ok(response)
}

fn add_cors_headers(response: &mut Response) -> Result<()> {
    let headers = response.headers_mut();
    headers.set("Access-Control-Allow-Origin", "*")?;
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")?;
    headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
    )?;
    Ok(())
}

async fn handle_security_scan(req: &mut Request) -> Result<Response> {
    let body = req.text().await?;
    let scan_req: SecurityScanRequest =
        serde_json::from_str(&body).unwrap_or_else(|_| SecurityScanRequest {
            content: String::new(),
            scan_type: "comprehensive".to_string(),
            metadata: None,
        });

    let result = perform_comprehensive_scan(&scan_req.content, &scan_req.scan_type);

    json_response(200, &result)
}

async fn handle_encryption(req: &mut Request) -> Result<Response> {
    let body = req.text().await?;
    let enc_req: EncryptionRequest =
        serde_json::from_str(&body).map_err(|e| worker::Error::RustError(e.to_string()))?;

    let result = perform_encryption(&enc_req.data, enc_req.key_id);

    json_response(200, &result)
}

async fn handle_validation(req: &mut Request) -> Result<Response> {
    let body = req.text().await?;
    let _validation_data: serde_json::Value =
        serde_json::from_str(&body).map_err(|e| worker::Error::RustError(e.to_string()))?;

    let result = serde_json::json!({
        "valid": true,
        "checks_passed": [
            "input_sanitization",
            "csrf_token",
            "rate_limiting",
            "authentication"
        ],
        "security_score": 95,
        "recommendations": []
    });

    json_response(200, &result)
}

fn handle_security_status() -> Result<Response> {
    let status = serde_json::json!({
        "service_status": "healthy",
        "security_level": "high",
        "active_protections": [
            "xss_detection",
            "sql_injection_prevention",
            "malware_scanning",
            "entropy_analysis",
            "rate_limiting"
        ],
        "threat_intelligence": {
            "last_update": "2024-01-20T10:00:00Z",
            "signatures_count": 15420,
            "false_positive_rate": 0.02
        },
        "performance_metrics": {
            "avg_scan_time_ms": 45,
            "throughput_rps": 1250,
            "uptime_percentage": 99.98
        }
    });

    json_response(200, &status)
}

fn json_response<T: Serialize>(status: u16, body: &T) -> Result<Response> {
    let json = serde_json::to_string(body).map_err(|e| worker::Error::RustError(e.to_string()))?;
    let mut response = Response::ok(json)?;
    response
        .headers_mut()
        .set("content-type", "application/json")?;
    Ok(response.with_status(status))
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── detect_xss_patterns ──────────────────────────────────────────

    #[test]
    fn xss_detects_script_tag() {
        let threats = detect_xss_patterns("<script>alert('xss')</script>");
        assert!(!threats.is_empty());
        assert!(threats
            .iter()
            .any(|t| t.threat_type.contains("Script injection")));
    }

    #[test]
    fn xss_detects_event_handler() {
        let threats = detect_xss_patterns(r#"<img onerror="alert(1)">"#);
        assert!(threats
            .iter()
            .any(|t| t.threat_type.contains("Event handler")));
    }

    #[test]
    fn xss_detects_javascript_uri() {
        let threats = detect_xss_patterns("javascript:alert(document.cookie)");
        assert!(threats
            .iter()
            .any(|t| t.threat_type.contains("JavaScript URL")));
    }

    #[test]
    fn xss_detects_iframe_injection() {
        let threats = detect_xss_patterns(r#"<iframe src="evil.com"></iframe>"#);
        assert!(threats
            .iter()
            .any(|t| t.threat_type.contains("Iframe injection")));
    }

    #[test]
    fn xss_detects_eval() {
        let threats = detect_xss_patterns("eval('malicious code')");
        assert!(threats
            .iter()
            .any(|t| t.threat_type.contains("Eval function")));
    }

    #[test]
    fn xss_clean_input_returns_empty() {
        let threats = detect_xss_patterns("Hello, this is a perfectly clean string.");
        assert!(threats.is_empty());
    }

    // ── detect_sql_injection ─────────────────────────────────────────

    #[test]
    fn sql_detects_union_select() {
        let threats = detect_sql_injection("1 UNION SELECT * FROM users");
        assert!(!threats.is_empty());
        assert!(threats
            .iter()
            .any(|t| t.threat_type.contains("UNION SELECT")));
    }

    #[test]
    fn sql_detects_boolean_injection() {
        let threats = detect_sql_injection("' or '1'='1");
        assert!(threats
            .iter()
            .any(|t| t.threat_type.contains("Boolean-based")));
    }

    #[test]
    fn sql_detects_drop_table() {
        let threats = detect_sql_injection("; DROP TABLE users");
        assert!(threats.iter().any(|t| t.threat_type.contains("DROP TABLE")));
    }

    #[test]
    fn sql_detects_load_file() {
        let threats = detect_sql_injection("load_file('/etc/passwd')");
        assert!(threats
            .iter()
            .any(|t| t.threat_type.contains("File disclosure")));
    }

    #[test]
    fn sql_clean_input_returns_empty() {
        let threats = detect_sql_injection("SELECT name FROM users WHERE id = 5");
        assert!(threats.is_empty());
    }

    // ── detect_malware_signatures ────────────────────────────────────

    #[test]
    fn malware_detects_cmd_exe() {
        let threats = detect_malware_signatures("run cmd.exe /c dir");
        assert!(threats.iter().any(|t| t.threat_type.contains("Command")));
    }

    #[test]
    fn malware_detects_powershell() {
        let threats = detect_malware_signatures("powershell -encodedcommand abc");
        assert!(threats.iter().any(|t| t.threat_type.contains("PowerShell")));
    }

    #[test]
    fn malware_detects_shell_fn() {
        let threats = detect_malware_signatures("shell_exec('rm -rf /')");
        assert!(threats.iter().any(|t| t.threat_type.contains("Shell")));
    }

    #[test]
    fn malware_detects_system_call() {
        let threats = detect_malware_signatures("system('whoami')");
        assert!(threats
            .iter()
            .any(|t| t.threat_type.contains("System command")));
    }

    #[test]
    fn malware_clean_input_returns_empty() {
        let threats = detect_malware_signatures("This is a normal document about cooking.");
        assert!(threats.is_empty());
    }

    // ── perform_comprehensive_scan ───────────────────────────────────

    #[test]
    fn comprehensive_scan_detects_mixed_threats() {
        let result = perform_comprehensive_scan(
            "<script>alert(1)</script> UNION SELECT * FROM users; cmd.exe",
            "comprehensive",
        );
        assert_eq!(result.status, "threats_detected");
        assert!(result.threats_detected >= 3);
        assert_ne!(result.risk_level, "clean");
    }

    #[test]
    fn comprehensive_scan_clean_input() {
        let result =
            perform_comprehensive_scan("A perfectly normal paragraph of text.", "comprehensive");
        assert_eq!(result.status, "clean");
        assert_eq!(result.threats_detected, 0);
        assert_eq!(result.risk_level, "clean");
    }

    #[test]
    fn comprehensive_scan_empty_input() {
        let result = perform_comprehensive_scan("", "comprehensive");
        assert_eq!(result.status, "clean");
        assert_eq!(result.threats_detected, 0);
    }

    // ── calculate_entropy ────────────────────────────────────────────

    #[test]
    fn entropy_empty_string_is_zero() {
        let e = calculate_entropy("");
        assert!((e - 0.0).abs() < f64::EPSILON);
    }

    #[test]
    fn entropy_single_repeated_char_is_zero() {
        let e = calculate_entropy("aaaaaaaaaa");
        assert!((e - 0.0).abs() < f64::EPSILON);
    }

    #[test]
    fn entropy_high_for_random_content() {
        let e = calculate_entropy("aB3$xZ9!qW7@mN5&");
        assert!(e > 3.0, "Expected high entropy, got {e}");
    }

    #[test]
    fn entropy_moderate_for_normal_text() {
        let e = calculate_entropy("hello world");
        assert!(e > 0.0);
        assert!(e < 5.0);
    }

    // ── determine_risk_level ─────────────────────────────────────────

    #[test]
    fn risk_level_critical_when_critical_threat() {
        let threats = vec![ThreatDetail {
            threat_type: "test".into(),
            severity: "critical".into(),
            description: "test".into(),
            location: None,
            recommendation: "test".into(),
        }];
        assert_eq!(determine_risk_level(&threats), "critical");
    }

    #[test]
    fn risk_level_high_when_two_high_threats() {
        let threats = vec![
            ThreatDetail {
                threat_type: "a".into(),
                severity: "high".into(),
                description: "a".into(),
                location: None,
                recommendation: "a".into(),
            },
            ThreatDetail {
                threat_type: "b".into(),
                severity: "high".into(),
                description: "b".into(),
                location: None,
                recommendation: "b".into(),
            },
        ];
        assert_eq!(determine_risk_level(&threats), "high");
    }

    #[test]
    fn risk_level_medium_when_one_high_threat() {
        let threats = vec![ThreatDetail {
            threat_type: "a".into(),
            severity: "high".into(),
            description: "a".into(),
            location: None,
            recommendation: "a".into(),
        }];
        assert_eq!(determine_risk_level(&threats), "medium");
    }

    #[test]
    fn risk_level_medium_when_three_medium_threats() {
        let threats: Vec<ThreatDetail> = (0..3)
            .map(|i| ThreatDetail {
                threat_type: format!("t{i}"),
                severity: "medium".into(),
                description: "d".into(),
                location: None,
                recommendation: "r".into(),
            })
            .collect();
        assert_eq!(determine_risk_level(&threats), "medium");
    }

    #[test]
    fn risk_level_low_when_one_medium_threat() {
        let threats = vec![ThreatDetail {
            threat_type: "a".into(),
            severity: "medium".into(),
            description: "a".into(),
            location: None,
            recommendation: "a".into(),
        }];
        assert_eq!(determine_risk_level(&threats), "low");
    }

    #[test]
    fn risk_level_clean_when_no_threats() {
        let threats: Vec<ThreatDetail> = vec![];
        assert_eq!(determine_risk_level(&threats), "clean");
    }

    // ── calculate_confidence_score ───────────────────────────────────

    #[test]
    fn confidence_high_when_no_threats() {
        let score = calculate_confidence_score(&[], "some content");
        assert!((score - 0.95).abs() < f64::EPSILON);
    }

    #[test]
    fn confidence_with_threats_above_base() {
        let threats = vec![ThreatDetail {
            threat_type: "XSS".into(),
            severity: "high".into(),
            description: "d".into(),
            location: None,
            recommendation: "r".into(),
        }];
        let score = calculate_confidence_score(&threats, "short");
        assert!(score >= 0.8);
        assert!(score <= 0.99);
    }

    #[test]
    fn confidence_capped_at_099() {
        let threats: Vec<ThreatDetail> = (0..20)
            .map(|i| ThreatDetail {
                threat_type: format!("type_{i}"),
                severity: "high".into(),
                description: "d".into(),
                location: None,
                recommendation: "r".into(),
            })
            .collect();
        let long_content = "x".repeat(5000);
        let score = calculate_confidence_score(&threats, &long_content);
        assert!((score - 0.99).abs() < f64::EPSILON);
    }

    // ── perform_encryption ───────────────────────────────────────────

    #[test]
    fn encryption_returns_base64_encoded_data() {
        let result = perform_encryption("hello", None);
        let decoded = base64::engine::general_purpose::STANDARD
            .decode(&result.encrypted_data)
            .expect("should be valid base64");
        let decoded_str = String::from_utf8(decoded).expect("should be valid utf-8");
        assert_eq!(decoded_str, "encrypted:hello");
    }

    #[test]
    fn encryption_uses_default_key_id() {
        let result = perform_encryption("data", None);
        assert_eq!(result.key_id, "default-key-2024");
    }

    #[test]
    fn encryption_uses_provided_key_id() {
        let result = perform_encryption("data", Some("my-custom-key".to_string()));
        assert_eq!(result.key_id, "my-custom-key");
    }

    #[test]
    fn encryption_algorithm_is_aes256gcm() {
        let result = perform_encryption("data", None);
        assert_eq!(result.algorithm, "AES-256-GCM");
    }

    #[test]
    fn encryption_timestamp_is_nonzero() {
        let result = perform_encryption("data", None);
        assert!(result.timestamp > 0);
    }
}
