use api_gateway::rewrite_upstream_path_for_test;
use proptest::prelude::*;

proptest! {
    #[test]
    fn rewrites_known_prefixes(rest in "(/[a-zA-Z0-9/_\\-]{0,64})?") {
        let p = format!("/api/auth{rest}");
        prop_assert_eq!(rewrite_upstream_path_for_test(&p, "auth-service"), format!("/api/auth{}", rest));

        let p = format!("/api/countries{rest}");
        prop_assert_eq!(rewrite_upstream_path_for_test(&p, "location-service"), format!("/api/countries{}", rest));
    }
}
