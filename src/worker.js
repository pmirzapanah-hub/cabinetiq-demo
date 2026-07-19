export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/analyze') {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Use POST' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return handleAnalyze(request, env);
    }

    // Everything else: serve the static site from /public
    return env.ASSETS.fetch(request);
  }
};

async function handleAnalyze(request, env) {
  const apiKey = env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Server is not configured with an API key. Set ANTHROPIC_API_KEY in Workers & Pages > Settings > Variables.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

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
