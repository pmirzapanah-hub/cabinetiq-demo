// Cloudflare Pages Function
// Route: POST /api/analyze
// Purpose: proxy plan-analysis requests to the Anthropic API without ever
// exposing the API key to the browser. The key lives only in the Cloudflare
// Pages project's environment variables (set as a secret, not plaintext).

export async function onRequestPost(context) {
  const apiKey = context.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Server is not configured with an API key. Set ANTHROPIC_API_KEY in Cloudflare Pages > Settings > Environment variables.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body;
  try {
    body = await context.request.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Basic guardrails so this endpoint can't be trivially abused to run
  // arbitrary large/expensive requests through your key.
  const allowedModel = 'claude-sonnet-4-6';
  if (body.model !== allowedModel) {
    return new Response(JSON.stringify({ error: 'Unsupported model' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  if (typeof body.max_tokens !== 'number' || body.max_tokens > 1500) {
    body.max_tokens = 1000;
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Upstream request failed: ' + err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Reject other methods explicitly so GET/PUT etc. don't fall through
// to a confusing 404.
export async function onRequestGet() {
  return new Response(JSON.stringify({ error: 'Use POST' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}
