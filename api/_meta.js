/* ============================================================
   META CONVERSIONS API — shared sender
   Leading underscore: Vercel does not route _-prefixed files, so this is a
   module for the handlers beside it and not a public endpoint.

   Environment (Vercel > Project > Settings > Environment Variables):
     META_PIXEL_ID         1389268022937431  (same dataset as the browser)
     META_CAPI_TOKEN       Events Manager > Settings > Conversions API >
                           Generate access token. SECRET — never in the repo.
     META_TEST_EVENT_CODE  optional, e.g. TEST82007. Routes events to
                           Events Manager > Test Events instead of counting
                           them as live. REMOVE IT once verified.
   ============================================================ */
'use strict';

const crypto = require('crypto');

/* Pinned rather than floating: Meta retires versions on a schedule, and a
   silent bump is how a working pixel starts returning errors nobody reads. */
const GRAPH_VERSION = 'v21.0';

/* Meta matches on SHA-256 of the normalised value, never the raw one. */
function hash(value) {
  if (value === undefined || value === null) return null;
  const v = String(value).trim().toLowerCase();
  return v ? crypto.createHash('sha256').update(v).digest('hex') : null;
}

function configured() {
  return Boolean(process.env.META_PIXEL_ID && process.env.META_CAPI_TOKEN);
}

async function send(events) {
  if (!configured()) {
    return { ok: false, status: 501, body: { error: 'CAPI is not configured on this deployment' } };
  }

  const payload = { data: events };
  if (process.env.META_TEST_EVENT_CODE) {
    payload.test_event_code = process.env.META_TEST_EVENT_CODE;
  }

  const url = 'https://graph.facebook.com/' + GRAPH_VERSION + '/' +
              encodeURIComponent(process.env.META_PIXEL_ID) + '/events' +
              '?access_token=' + encodeURIComponent(process.env.META_CAPI_TOKEN);

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    /* Meta unreachable. The browser leg already fired; do not fail loudly. */
    return { ok: false, status: 502, body: { error: 'upstream unreachable' } };
  }

  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

module.exports = { hash, send, configured, GRAPH_VERSION };
