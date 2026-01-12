#![warn(clippy::all, clippy::pedantic)]

use anyhow::{Context, Result};
use http::{HeaderValue, Uri};
use hyper::{body::Incoming, service::service_fn, Request, Response};
use hyper_rustls::HttpsConnectorBuilder;
use hyper_util::{
    client::legacy::Client,
    rt::{TokioExecutor, TokioIo},
    server::conn::auto::Builder as AutoBuilder,
};
use rustls::{pki_types::CertificateDer, pki_types::PrivateKeyDer, ServerConfig};
use std::{env, net::SocketAddr, sync::Arc};
use tokio::net::TcpListener;
use tokio_rustls::TlsAcceptor;
use tracing::{event, Level};

#[derive(Clone)]
struct AppState {
    upstream_base: Uri,
    client: Client<
        hyper_rustls::HttpsConnector<hyper_util::client::legacy::connect::HttpConnector>,
        Incoming,
    >,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_target(false)
        .compact()
        .init();

    let listen_addr: SocketAddr = env::var("EDGE_LISTEN_ADDR")
        .unwrap_or_else(|_| "0.0.0.0:8443".to_string())
        .parse()
        .context("EDGE_LISTEN_ADDR must be host:port")?;

    let upstream_base: Uri = env::var("EDGE_UPSTREAM_BASE")
        .unwrap_or_else(|_| "https://example.invalid".to_string())
        .parse()
        .context("EDGE_UPSTREAM_BASE must be a valid URI")?;

    let tls_cert_path = env::var("EDGE_TLS_CERT_PATH").context("EDGE_TLS_CERT_PATH is required")?;
    let tls_key_path = env::var("EDGE_TLS_KEY_PATH").context("EDGE_TLS_KEY_PATH is required")?;

    let tls_config = load_tls_config(&tls_cert_path, &tls_key_path).await?;
    let tls_acceptor = TlsAcceptor::from(Arc::new(tls_config));

    let https = HttpsConnectorBuilder::new()
        .with_native_roots()
        .context("Failed to load native roots")?
        .https_or_http()
        .enable_http2()
        .build();
    let client: Client<_, Incoming> = Client::builder(TokioExecutor::new()).build(https);

    let state = AppState {
        upstream_base,
        client,
    };

    let listener = TcpListener::bind(listen_addr)
        .await
        .with_context(|| format!("Failed to bind {listen_addr}"))?;

    event!(
        Level::INFO,
        listen_addr = %listen_addr,
        upstream = %state.upstream_base,
        "edge-proxy listening"
    );

    loop {
        let (tcp, peer) = listener.accept().await?;
        let acceptor = tls_acceptor.clone();
        let state = state.clone();

        tokio::spawn(async move {
            let tls = match acceptor.accept(tcp).await {
                Ok(tls) => tls,
                Err(e) => {
                    event!(Level::WARN, error = %e, peer = %peer, "tls handshake failed");
                    return;
                }
            };

            let svc = service_fn(move |req| proxy(req, state.clone()));
            let io = TokioIo::new(tls);
            let builder = AutoBuilder::new(TokioExecutor::new());

            if let Err(e) = builder.serve_connection(io, svc).await {
                event!(Level::WARN, error = %e, peer = %peer, "connection error");
            }
        });
    }
}

async fn proxy(
    req: Request<Incoming>,
    state: AppState,
) -> Result<Response<Incoming>, hyper_util::client::legacy::Error> {
    let (mut parts, body) = req.into_parts();
    let new_uri = edge_proxy::rewrite_uri(&state.upstream_base, &parts.uri);
    parts.uri = new_uri;

    parts.headers.remove("host");
    parts
        .headers
        .entry("x-forwarded-proto")
        .or_insert(HeaderValue::from_static("https"));

    let out_req = Request::from_parts(parts, body);
    state.client.request(out_req).await
}

async fn load_tls_config(cert_path: &str, key_path: &str) -> Result<ServerConfig> {
    let cert_bytes = tokio::fs::read(cert_path)
        .await
        .with_context(|| format!("Failed reading cert at {cert_path}"))?;
    let key_bytes = tokio::fs::read(key_path)
        .await
        .with_context(|| format!("Failed reading key at {key_path}"))?;

    let mut cert_reader = std::io::Cursor::new(cert_bytes);
    let mut key_reader = std::io::Cursor::new(key_bytes);

    let certs: Vec<CertificateDer<'static>> = rustls_pemfile::certs(&mut cert_reader)
        .collect::<std::result::Result<Vec<_>, _>>()
        .context("Failed to parse cert PEM")?;

    let key = rustls_pemfile::private_key(&mut key_reader)
        .context("Failed to parse key PEM")?
        .context("No private key found in PEM")?;
    let key: PrivateKeyDer<'static> = key;

    let config = rustls::ServerConfig::builder()
        .with_no_client_auth()
        .with_single_cert(certs, key)
        .context("Invalid TLS key/cert pair")?;

    Ok(config)
}
