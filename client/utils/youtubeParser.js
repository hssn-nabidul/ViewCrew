const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export function parseYouTubeUrl(input) {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();

  if (YOUTUBE_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);

    if (url.hostname.includes('youtube.com')) {
      if (url.pathname.startsWith('/watch')) {
        return url.searchParams.get('v');
      }
      if (url.pathname.startsWith('/embed/')) {
        return url.pathname.split('/')[2];
      }
      if (url.pathname.startsWith('/shorts/')) {
        return url.pathname.split('/')[2];
      }
      if (url.pathname.startsWith('/live/')) {
        return url.pathname.split('/')[2];
      }
      if (url.pathname.startsWith('/v/')) {
        return url.pathname.split('/')[2];
      }
    }

    if (url.hostname === 'youtu.be') {
      return url.pathname.split('/')[1];
    }

    if (url.hostname.includes('youtube-nocookie.com')) {
      if (url.pathname.startsWith('/embed/')) {
        return url.pathname.split('/')[2];
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function isValidYouTubeUrl(input) {
  return parseYouTubeUrl(input) !== null;
}
