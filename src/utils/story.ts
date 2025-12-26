const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const WIKI_TEXT_URL = 'https://ru.wikipedia.org/api/rest_v1/page/random/summary';
const WIKI_WEAPONS_URL =
  'https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=Category:Weapons&gcmtype=file&gcmlimit=50&prop=imageinfo&iiprop=url&iiurlwidth=1080&format=json&origin=*';
const REQUEST_TIMEOUT_MS = 7000;

type StoryPayload = {
  background_type: 'image';
  url: string;
};

const pickRandom = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      continue;
    }
    if (current) {
      lines.push(current);
    }
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
};

const buildTextStoryDataUrl = (text: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context is not available.');
  }

  const palettes = [
    ['#0f2027', '#203a43', '#2c5364'],
    ['#141e30', '#243b55', '#1b3c59'],
    ['#1a2a6c', '#b21f1f', '#fdbb2d'],
  ];
  const [start, middle, end] = pickRandom(palettes);
  const gradient = ctx.createLinearGradient(0, 0, 0, STORY_HEIGHT);
  gradient.addColorStop(0, start);
  gradient.addColorStop(0.5, middle);
  gradient.addColorStop(1, end);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 72px Arial, sans-serif';

  const maxWidth = STORY_WIDTH * 0.8;
  const lines = wrapText(ctx, text, maxWidth);
  const lineHeight = 92;
  const totalHeight = lines.length * lineHeight;
  let y = (STORY_HEIGHT - totalHeight) / 2 + lineHeight / 2;

  for (const line of lines) {
    ctx.fillText(line, STORY_WIDTH / 2, y);
    y += lineHeight;
  }

  return canvas.toDataURL('image/jpeg', 0.9);
};

const fetchWithTimeout = async (url: string) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    window.clearTimeout(timeout);
  }
};

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image blob.'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });

const fetchRandomText = async () => {
  const response = await fetchWithTimeout(WIKI_TEXT_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch random text.');
  }
  const data = (await response.json()) as { extract?: string; title?: string };
  const text = data.extract?.trim() || data.title?.trim();
  if (!text) {
    throw new Error('Random text is empty.');
  }
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
};

const fetchRandomImageDataUrl = async () => {
  const response = await fetchWithTimeout(WIKI_WEAPONS_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch random image metadata.');
  }

  const data = (await response.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          imageinfo?: Array<{ thumburl?: string; url?: string }>;
        }
      >;
    };
  };
  const pages = data.query?.pages ? Object.values(data.query.pages) : [];
  const candidates = pages
    .map((page) => page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url)
    .filter((url): url is string => Boolean(url) && /\.(png|jpe?g)$/i.test(url));
  const url = pickRandom(candidates);
  if (!url) {
    throw new Error('Random image URL is missing.');
  }

  const imageResponse = await fetchWithTimeout(url);
  if (!imageResponse.ok) {
    throw new Error('Failed to download random image.');
  }

  const blob = await imageResponse.blob();
  return blobToDataUrl(blob);
};

export const buildRandomStoryPayload = async (): Promise<StoryPayload> => {
  const useText = Math.random() < 0.5;

  if (useText) {
    const text = await fetchRandomText();
    const url = buildTextStoryDataUrl(text);
    return { background_type: 'image', url };
  }

  try {
    const url = await fetchRandomImageDataUrl();
    return { background_type: 'image', url };
  } catch {
    const fallbackText = 'Random image is unavailable. Here is a quote instead.';
    const url = buildTextStoryDataUrl(fallbackText);
    return { background_type: 'image', url };
  }
};
