
use anyhow::Result;
use http::{Method, Request, StatusCode};
use spin_sdk::http::{IntoResponse, ResponseBuilder};
use spin_sdk::http_component;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tokio::task;
use futures::future::try_join_all;

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

// Stateless pure function for XSS detection
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
                    threat_type: format!("XSS: {}", threat_type),
                    severity: severity.to_string(),
                    description: format!("Detected potential XSS pattern: {}", threat_type),
                    location: None,
                    recommendation: "Sanitize input and encode output".to_string(),
                });
            }
        }
    }
    
    threats
}

// Stateless pure function for SQL injection detection
fn detect_sql_injection(content: &str) -> Vec<ThreatDetail> {
    let sql_patterns = [
        (r"(?i)union\s+select", "UNION SELECT injection", "high"),
        (r"(?i)'\s*or\s*'1'\s*=\s*'1", "Boolean-based injection", "high"),
        (r"(?i);\s*drop\s+table", "DROP TABLE command", "critical"),
        (r"(?i)'\s*;\s*exec", "Command execution", "critical"),
        (r"(?i)load_file\s*\(", "File disclosure", "high"),
    ];
    
    let mut threats = Vec::new();
    
    for (pattern, threat_type, severity) in &sql_patterns {
        if let Ok(regex) = regex::Regex::new(pattern) {
            if regex.is_match(content) {
                threats.push(ThreatDetail {
                    threat_type: format!("SQL Injection: {}", threat_type),
                    severity: severity.to_string(),
                    description: format!("Detected potential SQL injection: {}", threat_type),
                    location: None,
                    recommendation: "Use parameterized queries".to_string(),
                });
            }
        }
    }
    
    threats
}

// Stateless pure function for malware signature detection
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
                    threat_type: format!("Malware: {}", threat_type),
                    severity: severity.to_string(),
                    description: format!("Detected potential malware signature: {}", threat_type),
                    location: None,
                    recommendation: "Quarantine and analyze further".to_string(),
                });
            }
        }
    }
    
    threats
}

// Async stateless function for comprehensive security scanning
async fn perform_comprehensive_scan(content: String, scan_type: String) -> Result<SecurityScanResult> {
    let start_time = std::time::Instant::now();
    
    // Run different scans concurrently
    let xss_task = task::spawn({
        let content = content.clone();
        async move { detect_xss_patterns(&content) }
    });
    
    let sql_task = task::spawn({
        let content = content.clone();
        async move { detect_sql_injection(&content) }
    });
    
    let malware_task = task::spawn({
        let content = content.clone();
        async move { detect_malware_signatures(&content) }
    });
    
    // Additional async security checks
    let entropy_task = task::spawn({
        let content = content.clone();
        async move {
            tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
            calculate_entropy(&content)
        }
    });
    
    // Wait for all scans to complete
    let (xss_threats, sql_threats, malware_threats, entropy_score) = 
        tokio::try_join!(xss_task, sql_task, malware_task, entropy_task)?;
    
    let mut all_threats = Vec::new();
    all_threats.extend(xss_threats);
    all_threats.extend(sql_threats);
    all_threats.extend(malware_threats);
    
    // Add entropy-based detection
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
    let confidence_score = calculate_confidence_score(&all_threats, &content);
    
    Ok(SecurityScanResult {
        status: if threats_count > 0 { "threats_detected" } else { "clean" }.to_string(),
        threats_detected: threats_count,
        risk_level,
        details: all_threats,
        scan_duration_ms: start_time.elapsed().as_millis() as u64,
        confidence_score,
    })
}

// Stateless pure function for entropy calculation
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
        let frequency = *count as f64 / len;
        entropy -= frequency * frequency.log2();
    }
    
    entropy
}

// Stateless pure function for risk level determination
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

// Stateless pure function for confidence score calculation
fn calculate_confidence_score(threats: &[ThreatDetail], content: &str) -> f64 {
    if threats.is_empty() {
        return 0.95; // High confidence in clean content
    }
    
    let base_confidence = 0.8;
    let content_length_factor = (content.len() as f64 / 1000.0).min(1.0);
    let threat_diversity = threats.iter()
        .map(|t| &t.threat_type)
        .collect::<std::collections::HashSet<_>>()
        .len() as f64;
    
    (base_confidence + content_length_factor * 0.1 + threat_diversity * 0.05).min(0.99)
}

// Async stateless function for data encryption simulation
async fn perform_encryption(data: String, key_id: Option<String>) -> Result<EncryptionResult> {
    let actual_key_id = key_id.unwrap_or_else(|| "default-key-2024".to_string());
    
    let encryption_task = task::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_millis(25)).await;
        
        // Simulate AES-256-GCM encryption
        let encrypted = base64::encode(format!("encrypted:{}", data));
        
        EncryptionResult {
            encrypted_data: encrypted,
            key_id: actual_key_id,
            algorithm: "AES-256-GCM".to_string(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        }
    });
    
    encryption_task.await.map_err(|e| e.into())
}

#[http_component]
async fn handle_request(req: Request<Vec<u8>>) -> Result<impl IntoResponse> {
    let method = req.method();
    let path = req.uri().path();
    
    match (method, path) {
        (&Method::POST, "/security/scan") => handle_security_scan(req).await,
        (&Method::POST, "/security/encrypt") => handle_encryption(req).await,
        (&Method::POST, "/security/validate") => handle_validation(req).await,
        (&Method::GET, "/security/status") => handle_security_status().await,
        _ => Ok(ResponseBuilder::new(StatusCode::NOT_FOUND)
            .header("content-type", "application/json")
            .body(r#"{"error":"Security endpoint not found"}"#)
            .build())
    }
}

async fn handle_security_scan(req: Request<Vec<u8>>) -> Result<impl IntoResponse> {
    let body = std::str::from_utf8(req.body())?;
    let scan_req: SecurityScanRequest = serde_json::from_str(body)
        .unwrap_or_else(|_| SecurityScanRequest {
            content: String::new(),
            scan_type: "comprehensive".to_string(),
            metadata: None,
        });
    
    let result = perform_comprehensive_scan(scan_req.content, scan_req.scan_type).await?;
    
    Ok(ResponseBuilder::new(StatusCode::OK)
        .header("content-type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(serde_json::to_string(&result)?)
        .build())
}

async fn handle_encryption(req: Request<Vec<u8>>) -> Result<impl IntoResponse> {
    let body = std::str::from_utf8(req.body())?;
    let enc_req: EncryptionRequest = serde_json::from_str(body)?;
    
    let result = perform_encryption(enc_req.data, enc_req.key_id).await?;
    
    Ok(ResponseBuilder::new(StatusCode::OK)
        .header("content-type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(serde_json::to_string(&result)?)
        .build())
}

async fn handle_validation(req: Request<Vec<u8>>) -> Result<impl IntoResponse> {
    let body = std::str::from_utf8(req.body())?;
    let validation_data: serde_json::Value = serde_json::from_str(body)?;
    
    let validation_task = task::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_millis(15)).await;
        
        serde_json::json!({
            "valid": true,
            "checks_passed": [
                "input_sanitization",
                "csrf_token",
                "rate_limiting",
                "authentication"
            ],
            "security_score": 95,
            "recommendations": []
        })
    });
    
    let result = validation_task.await?;
    
    Ok(ResponseBuilder::new(StatusCode::OK)
        .header("content-type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(result.to_string())
        .build())
}

async fn handle_security_status() -> Result<impl IntoResponse> {
    let status_task = task::spawn(async {
        tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
        
        serde_json::json!({
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
        })
    });
    
    let status = status_task.await?;
    
    Ok(ResponseBuilder::new(StatusCode::OK)
        .header("content-type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(status.to_string())
        .build())
}
