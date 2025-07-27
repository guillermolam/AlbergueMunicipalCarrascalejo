#[cfg(test)]
mod tests {
    use info_on_arrival_service::*;

    #[tokio::test]
    async fn test_info_service_creation() {
        let service = InfoOnArrivalService::new();
        assert!(true); // Basic smoke test
    }

    #[tokio::test]
    async fn test_get_emergency_contacts() {
        let service = InfoOnArrivalService::new();
        let result = service.get_emergency_contacts().await;
        assert!(result.is_ok());
        
        if let Ok(contacts_json) = result {
            assert!(contacts_json.contains("112"));
            assert!(contacts_json.contains("Emergencias"));
        }
    }

    #[tokio::test]
    async fn test_get_route_map() {
        let service = InfoOnArrivalService::new();
        let result = service.get_route_map("almendralejo").await;
        assert!(result.is_ok());
        
        if let Ok(map_json) = result {
            assert!(map_json.contains("Almendralejo"));
            assert!(map_json.contains("km"));
        }
    }
}