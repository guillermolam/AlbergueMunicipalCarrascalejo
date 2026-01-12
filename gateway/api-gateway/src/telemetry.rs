use once_cell::sync::OnceCell;

pub fn init_tracing() {
    static INIT: OnceCell<()> = OnceCell::new();
    INIT.get_or_init(|| {
        let _ = tracing_subscriber::fmt().with_target(false).compact().try_init();
    });
}

