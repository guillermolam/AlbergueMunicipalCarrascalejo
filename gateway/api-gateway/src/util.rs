pub fn parse_redis_int(res: &[Vec<u8>]) -> Option<i64> {
    res.get(0)
        .and_then(|v| String::from_utf8(v.clone()).ok())
        .and_then(|s| s.parse::<i64>().ok())
}

