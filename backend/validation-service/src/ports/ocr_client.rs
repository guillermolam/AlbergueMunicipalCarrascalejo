use shared::AlbergueResult;

#[async_trait::async_trait(?Send)]
pub trait OCRClient {
    async fn extract_text(&self, image_data: &[u8]) -> AlbergueResult<String>;
    async fn extract_text_with_confidence(
        &self,
        image_data: &[u8],
    ) -> AlbergueResult<(String, f32)>;
}
