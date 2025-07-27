use crate::domain::ScrapedContent;
use async_trait::async_trait;
use shared::AlbergueResult;

#[async_trait]
pub trait ScraperPort: Send + Sync {
    async fn scrape_merida_attractions(&self) -> AlbergueResult<ScrapedContent>;
    async fn scrape_carrascalejo_info(&self) -> AlbergueResult<ScrapedContent>;
    async fn scrape_weather_info(&self, location: &str) -> AlbergueResult<ScrapedContent>;
    async fn scrape_local_events(&self, location: &str) -> AlbergueResult<ScrapedContent>;
    async fn scrape_restaurants(&self) -> AlbergueResult<Vec<ScrapedContent>>;
    async fn scrape_taxi_services(&self) -> AlbergueResult<Vec<ScrapedContent>>;
    async fn scrape_car_rentals(&self) -> AlbergueResult<Vec<ScrapedContent>>;
}
