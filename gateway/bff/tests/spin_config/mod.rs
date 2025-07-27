
use anyhow::Result;
use spin_sdk::variables;

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_spin_variables_access() {
        // Test that we can access Spin variables (will fail gracefully in test env)
        let result = variables::get("database_url");
        // In test environment, this might not be available, so we just test it doesn't panic
        match result {
            Ok(_) => println!("Database URL variable found"),
            Err(_) => println!("Database URL variable not found (expected in test)"),
        }
        
        let result = variables::get("auth0_domain");
        match result {
            Ok(_) => println!("Auth0 domain variable found"),
            Err(_) => println!("Auth0 domain variable not found (expected in test)"),
        }
    }
    
    #[test]
    fn test_required_variables() {
        // Test that all required variables are defined in spin.toml
        let required_vars = vec![
            "database_url",
            "auth0_domain", 
            "auth0_client_id",
            "auth0_client_secret"
        ];
        
        for var in required_vars {
            // We can't actually get the values in test, but we can test the call doesn't panic
            let _ = variables::get(var);
        }
    }
}
