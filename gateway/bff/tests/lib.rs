
// Integration tests for Gateway BFF Service Composition
#[cfg(test)]
mod tests {
    pub mod cors;
    pub mod health;
    pub mod integration;
    pub mod routing;
    pub mod service_handlers;
    pub mod spin_config;
    pub mod unit;
}
