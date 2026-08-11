/**
 * Intelligent lead source detection with multiple fallback strategies
 * Priority: UTM > Click IDs > Referrer > Direct
 */

// Map common UTM source values to friendly labels
const sourceMapping: Record<string, string> = {
  'facebook': 'Facebook',
  'fb': 'Facebook',
  'instagram': 'Instagram',
  'ig': 'Instagram',
  'google': 'Google',
  'youtube': 'Youtube',
  'linkedin': 'LinkedIn',
  'tiktok': 'TikTok',
  'twitter': 'Twitter',
  'x': 'Twitter',
  'email': 'Email Marketing',
  'newsletter': 'Newsletter',
  'whatsapp': 'WhatsApp',
  'sms': 'SMS',
};

export const mapSourceToLabel = (source: string | null): string => {
  if (!source) return 'Direto';
  return sourceMapping[source.toLowerCase()] || source;
};

/**
 * Detect referrer-based source from document.referrer
 */
const detectReferrerSource = (referrer: string): string | null => {
  if (!referrer) return null;
  
  const lowerReferrer = referrer.toLowerCase();
  
  // Facebook domains (including redirect links)
  if (lowerReferrer.includes('facebook.com') || 
      lowerReferrer.includes('fb.com') || 
      lowerReferrer.includes('l.facebook.com') ||
      lowerReferrer.includes('m.facebook.com') ||
      lowerReferrer.includes('lm.facebook.com')) {
    return 'Facebook';
  }
  
  // Instagram domains
  if (lowerReferrer.includes('instagram.com') || 
      lowerReferrer.includes('l.instagram.com')) {
    return 'Instagram';
  }
  
  // Google domains
  if (lowerReferrer.includes('google.com') || 
      lowerReferrer.includes('google.pt') ||
      lowerReferrer.includes('google.co.') ||
      lowerReferrer.includes('googleapis.com')) {
    return 'Google';
  }
  
  // YouTube
  if (lowerReferrer.includes('youtube.com') || lowerReferrer.includes('youtu.be')) {
    return 'YouTube';
  }
  
  // LinkedIn
  if (lowerReferrer.includes('linkedin.com') || lowerReferrer.includes('lnkd.in')) {
    return 'LinkedIn';
  }
  
  // TikTok
  if (lowerReferrer.includes('tiktok.com')) {
    return 'TikTok';
  }
  
  // Twitter/X
  if (lowerReferrer.includes('twitter.com') || 
      lowerReferrer.includes('x.com') || 
      lowerReferrer.includes('t.co')) {
    return 'Twitter/X';
  }
  
  // WhatsApp Web
  if (lowerReferrer.includes('web.whatsapp.com') || lowerReferrer.includes('whatsapp.com')) {
    return 'WhatsApp';
  }
  
  // Has referrer but not recognized - it's from a landing page or other site
  return 'Landing Page';
};

/**
 * Meta's click-attribution window. A `_fbc` cookie lives ~90 days, far longer
 * than any sensible attribution, so it is only trusted inside this window —
 * otherwise a months-old ad click would keep claiming organic traffic.
 */
const FBC_ATTRIBUTION_WINDOW_MS = 28 * 24 * 60 * 60 * 1000;

/**
 * True when `_fbc` proves a recent Facebook ad click.
 *
 * The Pixel only creates `_fbc` when the visitor arrives with an `fbclid` in
 * the URL, and encodes it as `fb.<subdomainIndex>.<creationTimeMs>.<fbclid>`.
 * So its mere presence is evidence of an ad click — including when the click
 * id is long gone from the URL because the visitor landed on one page and
 * converted on another.
 */
const hasRecentFbClick = (fbc: string | undefined): boolean => {
  if (!fbc) return false;
  const parts = fbc.split('.');
  if (parts.length < 4 || parts[0] !== 'fb') return false;
  const createdAt = Number(parts[2]);
  if (!Number.isFinite(createdAt) || createdAt <= 0) return false;
  return Date.now() - createdAt <= FBC_ATTRIBUTION_WINDOW_MS;
};

export interface SourceDetectionResult {
  source: string;
  tracking: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    fbclid?: string;
    gclid?: string;
    ttclid?: string;
    referrer?: string;
    fbc?: string;
    fbp?: string;
    external_id?: string;
  };
}

/**
 * Comprehensive source detection with fallback chain:
 * 1. UTM source (most reliable when set)
 * 2. Click IDs (fbclid, gclid, ttclid)
 * 3. Document referrer analysis
 * 4. Direct (no source detected)
 */
export const detectLeadSource = (): SourceDetectionResult => {
  const urlParams = new URLSearchParams(window.location.search);
  
  // Collect all tracking parameters
  const tracking: SourceDetectionResult['tracking'] = {};
  
  // UTM parameters
  const utmSource = urlParams.get('utm_source');
  const utmMedium = urlParams.get('utm_medium');
  const utmCampaign = urlParams.get('utm_campaign');
  const utmContent = urlParams.get('utm_content');
  const utmTerm = urlParams.get('utm_term');
  
  if (utmSource) tracking.utm_source = utmSource;
  if (utmMedium) tracking.utm_medium = utmMedium;
  if (utmCampaign) tracking.utm_campaign = utmCampaign;
  if (utmContent) tracking.utm_content = utmContent;
  if (utmTerm) tracking.utm_term = utmTerm;
  
  // Click IDs
  const fbclid = urlParams.get('fbclid');
  const gclid = urlParams.get('gclid');
  const ttclid = urlParams.get('ttclid');
  
  if (fbclid) tracking.fbclid = fbclid;
  if (gclid) tracking.gclid = gclid;
  if (ttclid) tracking.ttclid = ttclid;

  // Meta cookies set by the Pixel (_fbp / _fbc) — needed for strong CAPI matching
  // and Pixel<->CAPI dedup. The backend forwards these to the Conversions API.
  const readCookie = (name: string): string | undefined => {
    if (typeof document === 'undefined') return undefined;
    const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]+)'));
    return m ? decodeURIComponent(m[1]) : undefined;
  };
  const fbpCookie = readCookie('_fbp');
  const fbcCookie = readCookie('_fbc');
  if (fbpCookie) tracking.fbp = fbpCookie;
  if (fbcCookie) tracking.fbc = fbcCookie;

  const externalIdKey = 'senvia_external_id';
  const externalIdFromUrl = urlParams.get('external_id');
  const externalIdCookie = readCookie(externalIdKey);
  const externalIdStored = localStorage.getItem(externalIdKey) || externalIdCookie;
  const externalId =
    externalIdFromUrl ||
    externalIdStored ||
    (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  localStorage.setItem(externalIdKey, externalId);
  document.cookie = `${externalIdKey}=${encodeURIComponent(externalId)}; path=/; domain=.senvia.pt; max-age=31536000; SameSite=Lax; Secure`;
  tracking.external_id = externalId;

  // Referrer
  const referrer = document.referrer;
  if (referrer) tracking.referrer = referrer;
  
  // --- Detection Priority Chain ---
  
  // 1. UTM source (highest priority - explicitly set)
  if (utmSource) {
    return {
      source: mapSourceToLabel(utmSource),
      tracking,
    };
  }
  
  // 2. Click IDs (indicate paid traffic even without UTMs)
  if (fbclid) {
    return {
      source: 'Facebook Ads',
      tracking,
    };
  }
  
  if (gclid) {
    return {
      source: 'Google Ads',
      tracking,
    };
  }
  
  if (ttclid) {
    return {
      source: 'TikTok Ads',
      tracking,
    };
  }

  // 2b. The _fbc cookie, which only exists because of an fbclid (see
  // hasRecentFbClick). Without this, a visitor who clicked an ad, landed on
  // the site and then converted on a page that no longer carried the click id
  // was recorded as "Direto" — invisible to every paid-traffic report despite
  // being paid traffic. Ranked above the referrer heuristic on purpose: a real
  // ad click is hard evidence, while the referrer is usually just our own
  // landing page.
  if (hasRecentFbClick(fbcCookie)) {
    return {
      source: 'Facebook Ads',
      tracking,
    };
  }

  // 3. Referrer analysis
  const referrerSource = detectReferrerSource(referrer);
  if (referrerSource) {
    return {
      source: referrerSource,
      tracking,
    };
  }
  
  // 4. No source detected - direct access
  return {
    source: 'Direto',
    tracking,
  };
};
