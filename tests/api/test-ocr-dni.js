
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Test the Lambda OCR function with the provided DNI image
async function testDNIOCR() {
    const imagePath = 'attached_assets/Screenshot 2025-07-17 214623_1753387007460.gif';
    
    try {
        // Read and convert image to base64
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        const dataURL = `data:image/gif;base64,${base64Image}`;
        
        console.log('Testing DNI OCR with Lambda function...');
        console.log('Image size:', imageBuffer.length, 'bytes');
        
        const lambdaUrl = 'https://ypeekiyyo4wb4mvzg3vsa2yy2m0lhmew.lambda-url.eu-west-3.on.aws/';
        
        const requestBody = {
            image_base64: base64Image,
            document_type: 'DNI',
            side: 'front'
        };
        
        console.log('Sending request to Lambda...');
        const response = await fetch(lambdaUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        const result = await response.text();
        console.log('Raw response:', result);
        
        if (response.ok) {
            try {
                const jsonResult = JSON.parse(result);
                console.log('\n=== OCR RESULTS ===');
                console.log('Success:', jsonResult.success);
                console.log('Document Type:', jsonResult.document_type);
                console.log('Processing Time:', jsonResult.processing_time_ms, 'ms');
                
                if (jsonResult.data) {
                    console.log('\n=== EXTRACTED DATA ===');
                    console.log('Document Number:', jsonResult.data.document_number);
                    console.log('First Name:', jsonResult.data.first_name);
                    console.log('Last Names:', jsonResult.data.last_names);
                    console.log('Birth Date:', jsonResult.data.birth_date);
                    console.log('Expiry Date:', jsonResult.data.expiry_date);
                    console.log('Nationality:', jsonResult.data.nationality);
                    console.log('Gender:', jsonResult.data.gender);
                    console.log('Confidence Score:', jsonResult.data.confidence_score);
                    console.log('Validation Valid:', jsonResult.data.validation?.format_valid);
                    console.log('Checksum Valid:', jsonResult.data.validation?.checksum_valid);
                }
                
                if (jsonResult.error) {
                    console.log('\n=== ERROR ===');
                    console.log(jsonResult.error);
                }
            } catch (parseError) {
                console.error('Failed to parse JSON response:', parseError);
            }
        } else {
            console.error('Request failed with status:', response.status);
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the test
testDNIOCR();
