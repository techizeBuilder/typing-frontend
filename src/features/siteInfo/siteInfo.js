// Institute links and public pages configured on the admin Settings page:
// Telegram / YouTube channels, the policy pages and the Contact Us details.
// Everything is read from the public GET /settings; anything left blank is hidden.
import { useEffect, useState } from 'react';
import { settingService } from '../../services/api';

export const CHANNEL_KEYS = { telegram: 'telegram_url', youtube: 'youtube_url' };

export const POLICY_PAGES = [
  { slug: 'terms', key: 'page_terms', title: 'Terms & Conditions' },
  { slug: 'privacy-policy', key: 'page_privacy', title: 'Privacy Policy' },
  { slug: 'refund-policy', key: 'page_refund', title: 'Refund & Cancellation Policy' },
];

export const CONTACT_KEYS = { phone: 'contact_phone', email: 'contact_email', address: 'contact_address', hours: 'contact_hours' };

const ALL_KEYS = [...Object.values(CHANNEL_KEYS), ...POLICY_PAGES.map((p) => p.key), ...Object.values(CONTACT_KEYS)];

// One request per app session, shared by every component; the Settings page
// calls refreshSiteInfo() after saving so open screens pick up the change.
let cache = null;
let pending = null;
const listeners = new Set();

const pick = (all) => Object.fromEntries(ALL_KEYS.map((k) => [k, (all?.[k] || '').trim()]));

function load() {
  if (!pending) {
    pending = settingService.getAll()
      .then((all) => { cache = pick(all); listeners.forEach((fn) => fn(cache)); return cache; })
      .catch(() => { pending = null; return cache; });
  }
  return pending;
}

export function refreshSiteInfo() {
  pending = null;
  return load();
}

export function useSiteInfo() {
  const [info, setInfo] = useState(cache);
  useEffect(() => {
    listeners.add(setInfo);
    load();
    return () => listeners.delete(setInfo);
  }, []);
  return info;
}

export const hasContact = (info) => !!info && Object.values(CONTACT_KEYS).some((k) => info[k]);

// Quick links that have content, in display order (policy pages, then Contact Us).
export function quickLinks(info) {
  if (!info) return [];
  const links = POLICY_PAGES.filter((p) => info[p.key]).map((p) => ({ label: p.title, to: `/${p.slug}` }));
  if (hasContact(info)) links.push({ label: 'Contact Us', to: '/contact' });
  return links;
}

// Plain-text page body → blocks. A line starting with "## " is a heading, lines
// starting with "- " form a bullet list, blank lines separate paragraphs.
export function parsePageText(text) {
  const blocks = [];
  let para = [];
  let list = null;
  const flush = () => {
    if (para.length) blocks.push({ type: 'p', text: para.join(' ') });
    if (list) blocks.push({ type: 'ul', items: list });
    para = [];
    list = null;
  };
  for (const raw of (text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (line.startsWith('## ')) { flush(); blocks.push({ type: 'h', text: line.slice(3).trim() }); continue; }
    if (/^[-•*] /.test(line)) {
      if (para.length) { blocks.push({ type: 'p', text: para.join(' ') }); para = []; }
      (list ||= []).push(line.slice(2).trim());
      continue;
    }
    if (list) { blocks.push({ type: 'ul', items: list }); list = null; }
    para.push(line);
  }
  flush();
  return blocks;
}
