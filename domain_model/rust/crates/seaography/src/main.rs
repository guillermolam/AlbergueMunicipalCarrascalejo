use albergue_persistence::db;
use async_graphql::EmptySubscription;
use async_graphql_poem::GraphQL;
use poem::{listener::TcpListener, Route, Server};
use seaography::builder::{Builder, BuilderContext};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
  tracing_subscriber::fmt()
    .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
    .init();

  let conn = db::connect_auto().await?;

  let context = BuilderContext::default()
    .register_entity::<albergue_persistence::entities::users::Entity>()
    .register_entity::<albergue_persistence::entities::pilgrims::Entity>()
    .register_entity::<albergue_persistence::entities::beds::Entity>()
    .register_entity::<albergue_persistence::entities::bookings::Entity>()
    .register_entity::<albergue_persistence::entities::payments::Entity>()
    .register_entity::<albergue_persistence::entities::pricing::Entity>()
    .register_entity::<albergue_persistence::entities::government_submissions::Entity>()
    .register_entity::<albergue_persistence::entities::notifications::Entity>()
    .register_entity::<albergue_persistence::entities::audit_log::Entity>();

  let schema = Builder::new(context, conn)
    .schema_builder()
    .subscription(EmptySubscription)
    .finish();

  let app = Route::new().at("/graphql", GraphQL::new(schema));

  Server::new(TcpListener::bind("127.0.0.1:8000"))
    .run(app)
    .await?;

  Ok(())
}
