use api_gateway_core::gateway_config_for_test;

#[test]
fn parses_gateway_toml() {
    let cfg =
        gateway_config_for_test(include_bytes!("../../api-gateway/config/gateway.toml")).unwrap();
    assert!(!cfg.services.is_empty());
}
