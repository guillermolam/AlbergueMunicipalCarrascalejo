import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.dailyGoalKm || !body.currentStageProgress || !body.ts) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: dailyGoalKm, currentStageProgress, ts' 
        }), 
        { 
          status: 400,
          headers: { 'content-type': 'application/json' }
        }
      );
    }
    
    // Validate data types and ranges
    const dailyGoalKm = Number(body.dailyGoalKm);
    const currentStageProgress = Number(body.currentStageProgress);
    const timestamp = Number(body.ts);
    
    if (!Number.isFinite(dailyGoalKm) || dailyGoalKm < 15 || dailyGoalKm > 35) {
      return new Response(
        JSON.stringify({ 
          error: 'dailyGoalKm must be a number between 15 and 35' 
        }), 
        { 
          status: 400,
          headers: { 'content-type': 'application/json' }
        }
      );
    }
    
    if (!Number.isFinite(currentStageProgress) || currentStageProgress < 0 || currentStageProgress > 100) {
      return new Response(
        JSON.stringify({ 
          error: 'currentStageProgress must be a number between 0 and 100' 
        }), 
        { 
          status: 400,
          headers: { 'content-type': 'application/json' }
        }
      );
    }
    
    if (!Number.isFinite(timestamp) || timestamp > Date.now() + 60000) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid timestamp' 
        }), 
        { 
          status: 400,
          headers: { 'content-type': 'application/json' }
        }
      );
    }
    
    // In a real implementation, you would save to database here
    // For now, we just validate and return success
    console.log('Progress sync received:', { dailyGoalKm, currentStageProgress, timestamp });
    
    return new Response(
      JSON.stringify({ ok: true }), 
      { 
        status: 200,
        headers: { 'content-type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('Progress sync error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error' 
      }), 
      { 
        status: 500,
        headers: { 'content-type': 'application/json' }
      }
    );
  }
};