
use anyhow::Result;
use spin_sdk::http::{Request, Response};

pub async fn handle(req: &Request) -> Result<Response> {
    // Perform security scanning
    let security_check_result = perform_security_scan(req).await;
    
    if security_check_result.is_threat {
        let error_body = serde_json::json!({
            "error": "Security Threat Detected",
            "threat_type": security_check_result.threat_type,
            "details": security_check_result.details
        });
        
        Ok(Response::builder()
            .status(403)
            .header("Content-Type", "application/json")
            .body(error_body.to_string())
            .build())
    } else {
        let success_body = serde_json::json!({
            "status": "clean",
            "scan_time": security_check_result.scan_time_ms
        });
        
        Ok(Response::builder()
            .status(200)
            .header("Content-Type", "application/json")
            .body(success_body.to_string())
            .build())
    }
}

struct SecurityScanResult {
    is_threat: bool,
    threat_type: Option<String>,
    details: Option<String>,
    scan_time_ms: u64,
}

async fn perform_security_scan(req: &Request) -> SecurityScanResult {
    let start_time = std::time::Instant::now();
    
    // Check for common attack patterns
    let body = std::str::from_utf8(req.body()).unwrap_or("");
    let uri = req.uri().to_string();
    let user_agent = req.headers()
        .get("user-agent")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("");
    
    // XSS detection
    if body.contains("<script>") || body.contains("javascript:") || uri.contains("<script>") {
        return SecurityScanResult {
            is_threat: true,
            threat_type: Some("XSS".to_string()),
            details: Some("Cross-site scripting attempt detected".to_string()),
            scan_time_ms: start_time.elapsed().as_millis() as u64,
        };
    }
    
    // SQL injection detection
    if body.contains("'; DROP TABLE") || body.contains("UNION SELECT") || body.contains("OR 1=1") {
        return SecurityScanResult {
            is_threat: true,
            threat_type: Some("SQL_INJECTION".to_string()),
            details: Some("SQL injection attempt detected".to_string()),
            scan_time_ms: start_time.elapsed().as_millis() as u64,
        };
    }
    
    // Malicious user agent detection
    if user_agent.contains("sqlmap") || user_agent.contains("nikto") || user_agent.contains("nmap") {
        return SecurityScanResult {
            is_threat: true,
            threat_type: Some("MALICIOUS_CLIENT".to_string()),
            details: Some("Malicious user agent detected".to_string()),
            scan_time_ms: start_time.elapsed().as_millis() as u64,
        };
    }
    
    SecurityScanResult {
        is_threat: false,
        threat_type: None,
        details: None,
        scan_time_ms: start_time.elapsed().as_millis() as u64,
    }
}
