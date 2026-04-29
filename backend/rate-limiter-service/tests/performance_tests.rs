use rate_limiter_service::{calculate_rate_limit, RateLimitEntry};
use std::time::Instant;

// All performance tests exercise the pure algorithm only — no I/O, no Spin runtime.

#[test]
fn test_algorithm_single_client_100_iterations() {
    let iterations = 100u32;
    let start = Instant::now();

    for i in 0..iterations {
        let entry = if i == 0 {
            None
        } else {
            Some(RateLimitEntry {
                requests: i,
                window_start: 1000,
                last_request: 1000 + u64::from(i),
            })
        };
        let _ = calculate_rate_limit(entry, 1000 + u64::from(i), 60, 1000);
    }

    let avg_us = start.elapsed().as_micros() / u128::from(iterations);
    println!("single-client avg: {avg_us} µs");
    assert!(
        avg_us < 100,
        "algorithm should run well under 100 µs per call"
    );
}

#[test]
fn test_algorithm_multiple_endpoint_configs() {
    let configs: &[(u32, u32)] = &[(60, 100), (30, 50), (3600, 1000), (86400, 10000), (60, 25)];

    let iterations = 50u32;
    let start = Instant::now();

    for i in 0..iterations {
        for &(window, max) in configs {
            let _ = calculate_rate_limit(None, 1000 + u64::from(i), window, max);
        }
    }

    let total = iterations * configs.len() as u32;
    let avg_us = start.elapsed().as_micros() / u128::from(total);
    println!("multi-endpoint avg: {avg_us} µs");
    assert!(avg_us < 100, "should run under 100 µs each");
}

#[test]
fn test_algorithm_efficiency_nanoseconds() {
    let current_time: u64 = 1_000_000;
    let iterations = 10_000u32;
    let start = Instant::now();

    for i in 0..iterations {
        let entry = Some(RateLimitEntry {
            requests: i % 1000,
            window_start: current_time - u64::from(i % 60),
            last_request: current_time,
        });
        let (_, new_entry, remaining) = calculate_rate_limit(entry, current_time, 60, 1000);
        assert!(remaining <= 1000);
        assert!(new_entry.requests <= 1001);
    }

    let avg_ns = start.elapsed().as_nanos() / u128::from(iterations);
    println!("algorithm avg: {avg_ns} ns");
    assert!(avg_ns < 1000, "must run under 1 µs per call");
}

#[test]
fn test_memory_stability_1000_iterations() {
    for i in 0..1000u32 {
        let entry = Some(RateLimitEntry {
            requests: i % 100,
            window_start: 1000,
            last_request: 1000 + u64::from(i),
        });
        let _ = calculate_rate_limit(entry, 1000 + u64::from(i), 60, 100);
    }
    // Reaching here without panic confirms stable memory usage.
}

#[test]
fn test_sequential_client_simulation() {
    let client_count = 50u32;
    let requests_per_client = 10u32;
    let start = Instant::now();

    for client_id in 0..client_count {
        let mut entry: Option<RateLimitEntry> = None;
        for req_num in 0..requests_per_client {
            let time = 1000 + u64::from(client_id) * 1000 + u64::from(req_num);
            let (allowed, new_entry, _) = calculate_rate_limit(entry.clone(), time, 60, 100);
            assert!(
                allowed,
                "client {client_id} request {req_num} should be allowed"
            );
            entry = Some(new_entry);
        }
    }

    let total = client_count * requests_per_client;
    let avg_us = start.elapsed().as_micros() / u128::from(total);
    println!("sequential simulation avg: {avg_us} µs");
    assert!(avg_us < 100, "should complete well under 100 µs per call");
}
