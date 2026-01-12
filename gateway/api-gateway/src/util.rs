pub fn parse_redis_int(res: &[spin_sdk::redis::RedisResult]) -> Option<i64> {
    match res.get(0)? {
        spin_sdk::redis::RedisResult::Int64(v) => Some(*v),
        spin_sdk::redis::RedisResult::Status(s) => s.parse::<i64>().ok(),
        spin_sdk::redis::RedisResult::Binary(v) => {
            String::from_utf8(v.clone()).ok()?.parse::<i64>().ok()
        }
        spin_sdk::redis::RedisResult::Nil => None,
    }
}
