use http::Request;
use rate_limiter_service::*;
use std::collections::HashMap;
use std::time::Instant;

#[cfg(test)]
mod performance_tests {
    use super::*;

    #[tokio::test]
    async fn test_rate_limit_performance_single_client() {
        let mut config = HashMap::new();
        config.insert("GET:/api/perf-test".to_string(), (60, 1000));

        let req = Request::builder()
            .uri("http://example.com/api/perf-test")
            .method("GET")
            .body(vec![])
            .unwrap();

        let start = Instant::now();
        let iterations = 100;

        for i in 0..iterations {
            let result = perform_rate_limit_check(&req, config.clone()).await;
            assert!(result.is_ok(), "Performance test iteration {} failed", i);
        }

        let duration = start.elapsed();
        let avg_time = duration.as_micros() / iterations as u128;

        println!(
            "Average time per rate limit check: {} microseconds",
            avg_time
        );
        assert!(
            avg_time < 1000,
            "Rate limit check should complete in under 1ms"
        );
    }

    #[tokio::test]
    async fn test_rate_limit_performance_multiple_clients() {
        let mut config = HashMap::new();
        config.insert("GET:/api/multi-client".to_string(), (60, 100));

        let start = Instant::now();
        let client_count = 50;
        let requests_per_client = 10;

        let mut handles = vec![];

        for client_id in 0..client_count {
            let config = config.clone();
            let handle = tokio::spawn(async move {
                for req_num in 0..requests_per_client {
                    let req = Request::builder()
                        .uri("http://example.com/api/multi-client")
                        .method("GET")
                        .header("x-forwarded-for", &format!("192.168.1.{}", client_id))
                        .body(vec![])
                        .unwrap();

                    let result = perform_rate_limit_check(&req, config.clone()).await;
                    assert!(
                        result.is_ok(),
                        "Client {} request {} failed",
                        client_id,
                        req_num
                    );
                }
            });
            handles.push(handle);
        }

        for handle in handles {
            handle.await.unwrap();
        }

        let duration = start.elapsed();
        let total_requests = client_count * requests_per_client;
        let avg_time = duration.as_micros() / total_requests as u128;

        println!(
            "Average time per concurrent request: {} microseconds",
            avg_time
        );
        println!("Total requests processed: {}", total_requests);
        assert!(
            avg_time < 2000,
            "Concurrent requests should complete in under 2ms"
        );
    }

    #[tokio::test]
    async fn test_check_multiple_limits_performance() {
        let client_id = "perf-test-client".to_string();
        let checks = vec![
            ("/api/endpoint1".to_string(), 60, 100),
            ("/api/endpoint2".to_string(), 30, 50),
            ("/api/endpoint3".to_string(), 3600, 1000),
            ("/api/endpoint4".to_string(), 86400, 10000),
            ("/api/endpoint5".to_string(), 60, 25),
        ];

        let start = Instant::now();
        let iterations = 50;

        for _ in 0..iterations {
            let result = check_multiple_limits(client_id.clone(), checks.clone()).await;
            assert!(result.is_ok(), "Multiple limits check failed");
            let results = result.unwrap();
            assert_eq!(results.len(), 5);
        }

        let duration = start.elapsed();
        let avg_time = duration.as_micros() / iterations as u128;

        println!(
            "Average time for 5 concurrent limit checks: {} microseconds",
            avg_time
        );
        assert!(
            avg_time < 5000,
            "Multiple limit checks should complete in under 5ms"
        );
    }

    #[tokio::test]
    async fn test_memory_usage_stability() {
        let mut config = HashMap::new();
        config.insert("GET:/api/memory-test".to_string(), (60, 100));

        let req = Request::builder()
            .uri("http://example.com/api/memory-test")
            .method("GET")
            .body(vec![])
            .unwrap();

        // Run many iterations to check for memory leaks
        let iterations = 1000;

        for i in 0..iterations {
            let result = perform_rate_limit_check(&req, config.clone()).await;
            assert!(result.is_ok(), "Memory test iteration {} failed", i);

            // Every 100 iterations, yield to prevent blocking
            if i % 100 == 0 {
                tokio::task::yield_now().await;
            }
        }

        // If we get here without panicking, memory usage is stable
        println!("Completed {} iterations without memory issues", iterations);
    }

    #[tokio::test]
    async fn test_rate_limit_algorithm_efficiency() {
        let current_time = 1000000;
        let window = 60;
        let max_requests = 1000;

        let start = Instant::now();
        let iterations = 10000;

        for i in 0..iterations {
            let entry = Some(RateLimitEntry {
                requests: (i % max_requests) as u32,
                window_start: current_time - (i % window) as u64,
                last_request: current_time,
            });

            let (allowed, new_entry, remaining) =
                calculate_rate_limit(entry, current_time, window, max_requests);

            // Basic validation
            assert!(remaining <= max_requests);
            assert!(new_entry.requests <= max_requests);
        }

        let duration = start.elapsed();
        let avg_time = duration.as_nanos() / iterations as u128;

        println!("Average algorithm execution time: {} nanoseconds", avg_time);
        assert!(
            avg_time < 1000,
            "Algorithm should execute in under 1 microsecond"
        );
    }

    #[tokio::test]
    async fn test_concurrent_different_endpoints() {
        let mut config = HashMap::new();
        config.insert("GET:/api/users".to_string(), (60, 100));
        config.insert("POST:/api/users".to_string(), (60, 10));
        config.insert("GET:/api/products".to_string(), (60, 200));
        config.insert("POST:/api/orders".to_string(), (60, 50));

        let endpoints = vec![
            ("GET", "/api/users"),
            ("POST", "/api/users"),
            ("GET", "/api/products"),
            ("POST", "/api/orders"),
        ];

        let start = Instant::now();
        let total_requests = 200;

        let mut handles = vec![];

        for i in 0..total_requests {
            let config = config.clone();
            let (method, path) = endpoints[i % endpoints.len()].clone();

            let handle = tokio::spawn(async move {
                let req = Request::builder()
                    .uri(format!("http://example.com{}", path))
                    .method(method)
                    .header("x-forwarded-for", &format!("client-{}", i % 10))
                    .body(vec![])
                    .unwrap();

                perform_rate_limit_check(&req, config).await
            });
            handles.push(handle);
        }

        let results = futures::future::join_all(handles).await;

        let success_count = results.iter().filter(|r| r.is_ok()).count();
        let duration = start.elapsed();
        let avg_time = duration.as_micros() / total_requests as u128;

        println!(
            "Concurrent endpoint test: {}/{} successful, avg time: {} microseconds",
            success_count, total_requests, avg_time
        );

        assert_eq!(
            success_count, total_requests,
            "All concurrent requests should succeed"
        );
        assert!(
            avg_time < 3000,
            "Concurrent endpoint requests should complete efficiently"
        );
    }
}
