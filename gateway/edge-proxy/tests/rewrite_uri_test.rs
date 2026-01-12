use edge_proxy::rewrite_uri;
use proptest::prelude::*;

proptest! {
    #[test]
    fn keeps_path_and_query(path in "/[a-zA-Z0-9/_\\-]{0,64}", query in "[a-zA-Z0-9=&_\\-]{0,64}") {
        let upstream: http::Uri = "https://example.com".parse().unwrap();
        let original: http::Uri = if query.is_empty() {
            format!("http://ignored.local{path}").parse().unwrap()
        } else {
            format!("http://ignored.local{path}?{query}").parse().unwrap()
        };
        let rewritten = rewrite_uri(&upstream, &original);
        assert_eq!(rewritten.scheme_str(), upstream.scheme_str());
        assert_eq!(rewritten.authority().unwrap().as_str(), "example.com");
        assert_eq!(rewritten.path(), original.path());
        assert_eq!(rewritten.query(), original.query());
    }
}

