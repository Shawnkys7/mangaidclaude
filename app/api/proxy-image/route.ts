import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';

const imageCache = new Map<string, { buffer: Buffer; contentType: string; time: number }>();
const MAX_CACHE_ENTRIES = 2000;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawTargetUrl = searchParams.get('url');

  if (!rawTargetUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  let targetUrl = rawTargetUrl.trim();
  if (targetUrl.startsWith('//')) {
    targetUrl = 'https:' + targetUrl;
  }
  targetUrl = targetUrl.replace(/^http:\/\//i, 'https://');
  targetUrl = targetUrl.split('?')[0];

  try {
    const cached = imageCache.get(targetUrl);
    if (cached) {
      return new NextResponse(new Uint8Array(cached.buffer), {
        headers: {
          'Content-Type': cached.contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const candidates: string[] = [targetUrl];

    // Thumbnail transformations
    if (targetUrl.includes('manga_img_horizontal-')) {
      candidates.push(targetUrl.replace('manga_img_horizontal-', 'manga_thumbnail-'));
    }
    if (targetUrl.includes('manga_thumbnail-')) {
      candidates.push(targetUrl.replace('manga_thumbnail-', 'manga_img_horizontal-'));
    }

    // Mirror domains for covers
    if (targetUrl.includes('thumbnail.komiku.org')) {
      candidates.push(targetUrl.replace('thumbnail.komiku.org', 'thumbnail.komiku.to'));
      candidates.push(targetUrl.replace('thumbnail.komiku.org', 'update.komikid.org'));
    } else if (targetUrl.includes('thumbnail.komiku.to')) {
      candidates.push(targetUrl.replace('thumbnail.komiku.to', 'thumbnail.komiku.org'));
      candidates.push(targetUrl.replace('thumbnail.komiku.to', 'update.komikid.org'));
    }

    // Mirror domains for chapter images
    const matchImageServer = targetUrl.match(/image\d+\.komiku\.to/);
    if (matchImageServer) {
      candidates.push(targetUrl.replace(matchImageServer[0], 'img.komiku.org'));
      candidates.push(targetUrl.replace(matchImageServer[0], 'image.komikid.org'));
    } else if (targetUrl.includes('img.komiku.org')) {
      candidates.push(targetUrl.replace('img.komiku.org', 'image2.komiku.to'));
      candidates.push(targetUrl.replace('img.komiku.org', 'image3.komiku.to'));
    }

    // Extension alternatives
    const extVariants: string[] = [];
    for (const c of candidates.slice(0, 4)) {
      if (c.endsWith('.jpg')) {
        extVariants.push(c.replace(/\.jpg$/, '.webp'));
      } else if (c.endsWith('.webp')) {
        extVariants.push(c.replace(/\.webp$/, '.jpg'));
      }
    }
    candidates.push(...extVariants);

    const uniqueCandidates = Array.from(new Set(candidates));
    let buffer: Buffer | null = null;
    let contentType = 'image/jpeg';

    for (let i = 0; i < uniqueCandidates.length; i += 3) {
      const batch = uniqueCandidates.slice(i, i + 3);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 1200);
          const referer = url.includes('myanimelist.net')
            ? 'https://myanimelist.net/'
            : 'https://komiku.org/';

          try {
            const res = await fetch(url, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': referer,
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
              },
              signal: controller.signal,
            });
            clearTimeout(timer);
            if (res.ok) {
              const arr = await res.arrayBuffer();
              if (arr && arr.byteLength > 100) {
                return {
                  buffer: Buffer.from(arr),
                  type: res.headers.get('content-type') || 'image/jpeg',
                };
              }
            }
            throw new Error('Not ok');
          } catch (e) {
            clearTimeout(timer);
            throw e;
          }
        })
      );

      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) {
          buffer = r.value.buffer;
          contentType = r.value.type;
          break;
        }
      }
      if (buffer) break;
    }

    if (!buffer) {
      for (const url of uniqueCandidates.slice(0, 2)) {
        try {
          const curlCmd = `curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -e "https://komiku.org/" -m 3 "${url}"`;
          const stdout = execSync(curlCmd, { maxBuffer: 15 * 1024 * 1024 });
          if (stdout && stdout.length > 100) {
            buffer = stdout;
            if (url.endsWith('.webp')) contentType = 'image/webp';
            else if (url.endsWith('.png')) contentType = 'image/png';
            else contentType = 'image/jpeg';
            break;
          }
        } catch {
          // ignore
        }
      }
    }

    if (!buffer) {
      return new NextResponse('Image not available', { status: 404 });
    }

    if (imageCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = imageCache.keys().next().value;
      if (oldestKey) imageCache.delete(oldestKey);
    }

    imageCache.set(targetUrl, {
      buffer,
      contentType,
      time: Date.now(),
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('Error proxying image:', err);
    return new NextResponse('Internal error proxying image', { status: 500 });
  }
}
