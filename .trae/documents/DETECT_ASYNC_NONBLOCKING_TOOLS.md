Tools to Detect Async and Blocking Behavior in Rust

Analyzing Async vs Blocking Behavior in Rust Code and Dependencies
Developers have a growing set of tools to identify asynchronous vs. blocking code in Rust. These include static analyzers (linters/IDEs) and dynamic profilers/monitors. Below we outline key tools and how they help detect blocking operations, whether in your own code or in third-party crates, and note their runtime specificity.
🛠️ Static Analysis Tools for Async/Blocking Detection
Rust Analyzer (IDE Language Server): Rust-Analyzer enriches editors with semantic insights. It clearly marks async fn in your code and dependencies (via hover or syntax highlighting), making it easy to see which APIs are asynchronous. While it doesn’t explicitly label “blocking” calls, you can use it to navigate and inspect functions – for example, you might quickly jump to a dependency’s definition to see if it’s an async fn or calls known blocking APIs. In practice, Rust-Analyzer helps surface sync vs. async mismatches (e.g. calling a sync std::fs function inside an async context would stand out during code review). Integration: It’s runtime-agnostic – works for any Rust project via your IDE, and can be part of CI by running cargo check/clippy with analysis flags. Clippy Lints and Compiler Checks: Clippy (Rust’s linter) and the compiler offer checks to prevent common async blocking pitfalls. For instance, the #[must_not_suspend] attribute can be applied to types like mutex guards; the compiler will warn if you hold such a value across an .await (since that often indicates a potential deadlock or blocking wait)
. This catches cases like holding a MutexGuard over an async suspension point. Clippy has also proposed lints for calling known blocking functions in async contexts. While not exhaustive, lints could flag obvious mistakes – e.g. using std::thread::sleep, std::fs::File::open, or even println! inside an async function
. Such calls block the thread and should be replaced with async alternatives or offloaded. These lints (some still in development) can be run in CI to automatically warn developers. The Rust Async Working Group has discussed more robust solutions (like a #[may_block] annotation on APIs
), but for now Clippy + must_not_suspend cover many cases. These static checks are runtime-agnostic – they apply to any async code, whether you use Tokio, async-std, etc. Manual Code Inspection for Dependencies: In absence of a dedicated tool to label a crate “blocking” or “async,” you can leverage Rust’s documentation and tree-shaking tools. For example, running cargo doc or checking docs.rs for a dependency will show if its functions are async (look for the async fn keyword or returns like impl Future). Also, cargo tree can reveal if a crate depends on async runtimes (e.g. Tokio or async-std) versus using only synchronous std libraries. A crate heavily using std::net or std::fs without async wrappers likely performs blocking I/O. While this is a bit manual, it helps in auditing third-party libraries. Some developers even write small scripts or use grep to find blocking calls in cargo vendor’d source. In summary: static analysis of dependencies often involves a combination of Clippy (to flag your usage of them in async code) and code reading (to determine if the crate internally is async-safe or not).
🔍 Dynamic Profiling & Runtime Monitoring Tools
When static analysis isn’t enough (e.g. a blocking call slips through), runtime tools can catch blocking behavior during execution: Tokio Console (Task Monitor): The Tokio Console is a real-time debugging UI for Tokio-based apps. It attaches instrumentation to the Tokio runtime and provides a text-based UI (or web UI) that acts like a “top for async tasks.” It displays all tasks, their states, poll counts, and busy/idle durations
. This helps pinpoint tasks that are stuck or long-running. For example, if one task is continuously busy (not yielding) far longer than others, it’s likely doing blocking work. The console will highlight such tasks (it can flag tasks that never yield or have an unusually high busy-to-idle ratio as possibly blocking
). To use it, you add the console-subscriber to your app and run the separate tokio-console viewer. It’s Tokio-specific – it relies on Tokio’s instrumentation – but within Tokio it works across any environment (dev or even production, with some overhead). It’s great for debugging performance issues by visualizing task activity. 
https://greptime.com/blogs/2023-05-24-biweekly-report
Tokio Console CLI showing live task diagnostics. Tasks with high busy time (and “tokio::task::blocking” labels) indicate operations that occupied the executor without yielding, which helps detect blocking sections
. Tokio-Blocked (Tracing Layer): tokio-blocked is a lightweight crate that integrates with Tokio’s experimental tracing support to log warnings when an async task is blocked by sync code. It essentially times each poll of a task and if a poll takes too long (e.g. > X microseconds), it prints a warning with the task location
. For example, if you accidentally call a blocking function inside a spawned task, that task’s poll will encompass the whole blocking call duration – tokio-blocked will detect that and emit a log (including the source location of the spawn). Under the hood it uses Tokio’s internal tracing of task poll times
. You enable it by activating Tokio’s tracing feature and adding the TokioBlockedLayer to your tracing subscriber. This tool is Tokio-only (since it hooks into Tokio’s scheduler), but it’s very useful in catching blocking calls under load. You can run your test suite or binary with RUSTFLAGS="--cfg tokio_unstable" and then look for “WARN tokio_blocked::task_poll_blocked” messages indicating a problem. Being log-based, it’s CI-friendly (you could fail CI if such warnings appear). “no-block-pls” (Async Section Profiler): no-block-pls is a community tool that instruments your async code to find long synchronous sections between .await points. It effectively walks your code, injects timers around each await, and logs if an async function runs for too long without yielding. In other words, it can detect blocking work or CPU-bound loops in async functions by measuring how long each await-suspension gap is
. You can use it as a library (to annotate functions) or a command-line tool. For example, you might run cargo install no-block-pls and then run it against your project; it will compile an instrumented version of your code and report any suspiciously slow sections. Internally it uses the tracing crate to emit warnings (so you can collect or filter them easily)
. Unlike the Tokio-specific tools, no-block-pls is runtime-agnostic: it works with any executor (Tokio, async-std, etc.) because it operates at the language level (instrumenting async/await usage). This makes it handy if you’re not on Tokio or want a broader tool. You could integrate it in CI to flag functions that consistently take too long between yields. (Keep in mind, what constitutes “too long” might be configurable or require tuning based on your app’s needs.) Tokio Metrics and Tracing: Another option for Tokio users is the tokio-metrics crate and tracing instrumentation. Tokio Metrics provides counters and histograms for task polls, idle times, etc., which you can export to dashboards. For example, it can record poll duration histograms for each task
. By analyzing these, you might detect outliers (tasks with high poll times = likely blocking). This isn’t a direct “alert on blocking” tool, but it integrates with monitoring systems (e.g. metrics can be fed to Prometheus). Similarly, you can use the general tracing crate in your async code to mark spans of interest. For instance, wrap a potential blocking call in a tracing::info_span!("section") and log timings – helpful for custom runtime or fine-grained profiling. These approaches are more roll-your-own but can be adapted to any runtime (for async-std, you’d manually instrument since it doesn’t have built-in console). Miri (Interpreter for UB and Concurrency): Although primarily for detecting unsafe code errors, Miri can also be leveraged to catch some async issues. Miri runs your code in an interpreter and will detect certain deadlocks or misuses of concurrency. For example, if your async code causes a true deadlock (all tasks waiting indefinitely), Miri may detect “blocked threads” and abort execution (it has a mode to detect when all threads are parked)
. It’s not specifically labeling functions as blocking or async, but it can catch issues like holding a lock forever or never waking a waker (which would manifest as a task stuck pending forever). Miri can also run the thread sanitizer to catch data races in async code. This tool is runtime-agnostic (works on your test binary via cargo miri run/test) but it’s more low-level and focused on correctness bugs rather than performance. Still, if you suspect a bug causing an async task to block (e.g. a never-.awaited future or a cycle causing deadlock), Miri might help pinpoint it. It’s best used in CI for unsafe-heavy code, but worth mentioning as part of the toolbox. Loom (Concurrency Testing): Loom is another advanced tool – it systematically explores possible thread interleavings in synchronization code. In the async context, developers use Loom to test types like async locks or channels. While Loom doesn’t directly scream “this function is blocking the runtime,” you can use it to ensure your primitives yield properly. For instance, if you wrote a custom Future or used Notify, Loom can test that a pending future eventually gets a wakeup. It’s primarily for library authors and works by simulating the executor. Loom is runtime-neutral (works by replacing atomic/threads with its own scheduler in tests). If a Loom test finds that a particular path results in tasks not progressing (a deadlock or starvation), that’s a sign of blocking behavior (or missing yield) in the code. This is a niche but powerful approach for ensuring your async algorithms are truly non-blocking.
⚙️ Choosing the Right Tool for the Job
Across different runtimes: If you’re on Tokio, you have the richest ecosystem (Console, Tokio-blocked, Tokio-metrics, etc., all Tokio-specific). These shine for tokio-based servers/services in development and can even be left on in production for diagnostics (with overhead considerations). For async-std or other runtimes, you’ll lean on more general tools: static lints (which apply equally), no-block-pls for profiling, and manual tracing/logging. The concepts are similar – e.g., async-std code can still be instrumented to measure how long operations take between .await points – but you might not have a one-stop “console”. In such cases, integrating tracing crate with your executor (if it supports it) or using OS profilers (like perf or dtrace to see where CPU time is spent) can help. Notably, many higher-level tools (Clippy lints, must_not_suspend) don’t depend on the runtime at all – they’ll warn about blocking calls in any async context. In CI vs local dev: Static tools (Clippy, Rust Analyzer, compiler lints) are perfect for CI – they prevent known bad patterns from ever landing in your codebase. For dynamic analysis, a common workflow is to run an instrumented version in a staging environment or under test load. For example, you might run your test suite with Tokio Console or tokio-blocked enabled to see if any warnings pop up. Some teams even automate a “load test” in CI with tokio-console attached to catch tasks that hog the executor. However, interactive tools like the console are often used ad-hoc during development or troubleshooting (they require running the app and observing). In contrast, something like no-block-pls could be scripted to fail if it logs any section taking longer than X ms, making it CI-friendly. In summary, Rust’s ecosystem is evolving to better detect blocking in async code. Linters and attributes guard against obvious mistakes at compile time (so you fix issues early), while profilers and consoles let you observe the running program to find less obvious blocking (e.g. a third-party crate doing sync I/O). Using a combination of these tools – e.g. Clippy to catch common blocking calls, plus Tokio Console or no-block-pls to profile runtime behavior – gives you confidence that both your own code and your dependencies are truly non-blocking and async-friendly
. Sources:
Rust Async WG discussion on blocking detection
Clippy lint proposal for blocking calls
Rust compiler must_not_suspend lint docs
Tokio Console usage and benefits
Tokio-Blocked crate (logs long task polls)
“no-block-pls” instrumentation tool description
Tokio Console warning heuristics (task never yielding)
Citations

MUST_NOT_SUSPEND in rustc_lint::builtin - Rust

https://doc.rust-lang.org/stable/nightly-rustc/rustc_lint/builtin/static.MUST_NOT_SUSPEND.html

Lint idea: find known-blocking constructs in async contexts · Issue #4377 · rust-lang/rust-clippy · GitHub

https://github.com/rust-lang/rust-clippy/issues/4377

Detect and prevent blocking functions in async code · Issue #19 · rust-lang/wg-async · GitHub

https://github.com/rust-lang/wg-async/issues/19
Biweekly Report (May.8 - May.21) – Tokio Console Enabled for Easier Troubleshooting | Greptime

https://greptime.com/blogs/2023-05-24-biweekly-report

rust - How can I monitor stalled tasks? - Stack Overflow

https://stackoverflow.com/questions/65696879/how-can-i-monitor-stalled-tasks

warnings: warning for potentially blocking tasks · Issue #150 · tokio-rs/console · GitHub

https://github.com/tokio-rs/console/issues/150

GitHub - theduke/tokio-blocked: Detect blocking code in Tokio async tasks : r/rust

https://www.reddit.com/r/rust/comments/1mythij/github_theduketokioblocked_detect_blocking_code/

GitHub - theduke/tokio-blocked: Detect blocking code in Tokio async tasks. (Rust)

https://github.com/theduke/tokio-blocked

instrumentation - Keywords - crates.io: Rust Package Registry

https://crates.io/keywords/instrumentation?sort=new

no-block-pls - crates.io: Rust Package Registry

https://crates.io/crates/no-block-pls/0.1.0

Announcing Tokio Metrics 0.1 | Tokio - An asynchronous Rust runtime

https://tokio.rs/blog/2022-02-announcing-tokio-metrics

Detect partial deadlocks #3425 - rust-lang/miri - GitHub

https://github.com/rust-lang/miri/issues/3425

Detect and prevent blocking functions in async code · Issue #19 · rust-lang/wg-async · GitHub

https://github.com/rust-lang/wg-async/issues/19
All Sources

doc.rust-lang

github
greptime

stackoverflow

reddit

crates

tokio