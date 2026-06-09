// Speed test utility using Google PageSpeed Insights API
// API key is kept server-side — calls go through /.netlify/functions/pagespeed

interface SpeedTestResults {
  loadingTime: number;
  mobileScore: number;
  desktopScore: number;
  keyIssues: string[];
  status: 'slow' | 'average' | 'fast';
}

// Helper function to add timeout to fetch
function fetchWithTimeout(url: string, options?: RequestInit, timeoutMs: number = 90000): Promise<Response> {
  return Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs / 1000} seconds`)), timeoutMs)
    )
  ]) as Promise<Response>;
}

async function callPageSpeed(targetUrl: string, strategy: 'mobile' | 'desktop'): Promise<any> {
  const response = await fetchWithTimeout(
    '/.netlify/functions/pagespeed',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl, strategy }),
    },
    90000
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    let errorMsg = errorData.error || response.statusText;

    if (response.status === 403 && errorMsg.includes('referer')) {
      errorMsg = 'API key has referer restrictions. Please configure your Google Cloud API key to allow requests from this domain, or remove referer restrictions.';
    } else if (response.status === 400 && errorMsg.includes('API key')) {
      errorMsg = 'Invalid API key. Please check the PageSpeed server environment variable.';
    }

    throw new Error(`${strategy} test failed: ${errorMsg} (${response.status})`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`API Error: ${data.error.message || data.error || 'Unknown error'}`);
  }
  return data;
}

export async function runSpeedTest(
  url: string,
  onProgress?: (progress: number, message: string) => void
): Promise<SpeedTestResults> {
  onProgress?.(5, 'Initializing speed test...');

  try {
    // Mobile test
    onProgress?.(10, 'Testing mobile performance...');

    const mobileData = await callPageSpeed(url, 'mobile');

    onProgress?.(40, 'Analyzing mobile results...');
    onProgress?.(50, 'Mobile test complete. Testing desktop performance...');

    // Desktop test
    const desktopData = await callPageSpeed(url, 'desktop');

    onProgress?.(80, 'Analyzing desktop results...');

    // Check for API errors in response
    if (desktopData.error) {
      throw new Error(`API Error: ${desktopData.error.message || 'Unknown error'}`);
    }

    onProgress?.(90, 'Generating report...');

    // Extract scores and metrics
    const mobileScore = Math.round((mobileData.lighthouseResult?.categories?.performance?.score || 0) * 100);
    const desktopScore = Math.round((desktopData.lighthouseResult?.categories?.performance?.score || 0) * 100);

    // Get loading time from First Contentful Paint (FCP) in seconds
    const fcpAudit = mobileData.lighthouseResult?.audits?.['first-contentful-paint'];
    const loadingTime = fcpAudit?.numericValue ? Math.round((fcpAudit.numericValue / 1000) * 10) / 10 : 0;

    // Extract key issues from audits (lowest scoring audits with actionable recommendations)
    const audits = mobileData.lighthouseResult?.audits || {};
    const keyIssues = Object.values(audits)
      .filter((audit: any) => {
        return audit.score !== null &&
               audit.score < 0.5 &&
               audit.score !== 1 &&
               audit.title &&
               audit.details?.type !== 'screenshot';
      })
      .sort((a: any, b: any) => (a.score || 1) - (b.score || 1))
      .slice(0, 5)
      .map((audit: any) => audit.title);

    // Determine status based on average score
    let status: 'slow' | 'average' | 'fast';
    const avgScore = (mobileScore + desktopScore) / 2;
    if (avgScore >= 70) {
      status = 'fast';
    } else if (avgScore >= 50) {
      status = 'average';
    } else {
      status = 'slow';
    }

    onProgress?.(100, 'Complete!');

    return {
      loadingTime,
      mobileScore,
      desktopScore,
      keyIssues: keyIssues.length > 0 ? keyIssues : ['No major issues detected'],
      status,
    };
  } catch (error) {
    console.error('Speed test error:', error);

    // Provide more specific error messages
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to speed test service. Please check your internet connection.');
    }

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error('The speed test is taking too long. The website might be slow or unreachable. Please try again.');
      }
      throw error;
    }
    throw new Error('An unknown error occurred while running the speed test');
  }
}
