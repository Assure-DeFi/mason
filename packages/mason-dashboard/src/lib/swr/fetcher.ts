/**
 * SWR fetcher utilities for client-side caching
 */

/**
 * Default fetcher for SWR that handles JSON responses
 */
export async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    const error = new Error('An error occurred while fetching the data.');
    throw error;
  }

  const json = await response.json();
  return json.data ?? json;
}

/**
 * Fetcher with POST method for mutations that return data
 */
export async function postFetcher<T>(
  url: string,
  { arg }: { arg: Record<string, unknown> },
): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(arg),
  });

  if (!response.ok) {
    const error = new Error('An error occurred while posting the data.');
    throw error;
  }

  const json = await response.json();
  return json.data ?? json;
}
