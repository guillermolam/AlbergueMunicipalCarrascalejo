#![deny(warnings)]
#![warn(clippy::all, clippy::pedantic)]
#![allow(clippy::module_name_repetitions)]

pub fn rewrite_uri(upstream_base: &http::Uri, original: &http::Uri) -> http::Uri {
    let mut parts = original.clone().into_parts();
    let up = upstream_base.clone().into_parts();
    parts.scheme = up.scheme;
    parts.authority = up.authority;
    http::Uri::from_parts(parts).unwrap_or_else(|_| upstream_base.clone())
}
