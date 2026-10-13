/* ============================================================
   POST /api/capi — browser -> server relay for the Meta Conversions API

   js/consent.js sends every funnel event twice: once through fbq in the
   browser, once here. Both carry the same event_id and Meta deduplicates
   them, so the numbers stay honest while the coverage doubles.

   Why it exists: connect.facebook.net is on every blocklist there is, and
   iOS strips a good share of what survives. This request goes to our own
   domain, so it lands when the browser leg does not.

   It is deliberately thin. It takes no event data it could not verify —
   no email, no phone, no custom values — because anyone can POST here. It
   forwards a fixed set of event names plus the browser's own Meta cookies,
   and adds the IP and user agent, which only the server can see.
   ============================================================ */
'use strict';

const { send } = require('./_meta.js');

/* Anything not on this list is refused rather than forwarded. An open relay
   into the ad account would let a stranger mint conversions and poison the
   optimisation the campaigns run on. */
const ALLOWED_EVENTS = new Set(['PageView', 'Contact', 'FormStarted', 'Lead']);

function trusted(req) {
  const src = req.headers.origin || req.headers.referer || '';
  if (!src) return false;
  let host;
  try { host = new URL(src).hostname; } catch (err) { return false; }
  /* hanostudio.xyz (no "s") is the partnership site, which runs this same
     code; both report to the same pixel. */
  return host === 'hanostudios.xyz' ||
         host.endsWith('.hanostudios.xyz') ||
         host === 'hanostudio.xyz' ||
         host.endsWith('.hanostudio.xyz') ||
         host.endsWith('.vercel.app');        /* preview deployments */
}

function str(value, max) {
  return typeof value === 'string' && value ? value.slice(0, max) : null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST only' });
  }
  if (!trusted(req)) return res.status(403).json({ error: 'forbidden' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (err) { body = null; }
  }
  if (!body || !ALLOWED_EVENTS.has(body.event_name)) {
    return res.status(400).json({ error: 'unknown event' });
  }

  const user_data = {};
  /* x-forwarded-for is a list; the client is the first entry. */
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (ip) user_data.client_ip_address = ip;
  if (req.headers['user-agent']) user_data.client_user_agent = req.headers['user-agent'];
  /* The pixel's own cookies. These are what actually tie a server event back
     to the ad click, so match quality lives or dies on them. */
  if (str(body.fbp, 200)) user_data.fbp = body.fbp;
  if (str(body.fbc, 400)) user_data.fbc = body.fbc;

  const event = {
    event_name: body.event_name,
    /* Server clock, not the client's — a wrong or spoofed timestamp gets the
       event dropped by Meta as out of window. Dedup keys on event_id anyway. */
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    user_data
  };
  const id = str(body.event_id, 100);
  if (id) event.event_id = id;
  const url = str(body.event_source_url, 500);
  if (url) event.event_source_url = url;

  const out = await send([event]);

  /* The browser ignores the outcome either way; returning the real status
     is what makes `curl` and the Vercel logs usable when something breaks. */
  if (!out.ok) return res.status(out.status).json(out.body);
  return res.status(200).json({ ok: true, event_id: event.event_id || null });
};
