// Redis has been removed. This module now contains general gateway utilities.

/// Parse a string as an i64, returning None if parsing fails.
#[must_use]
pub fn parse_int(s: &str) -> Option<i64> {
    s.parse::<i64>().ok()
}
