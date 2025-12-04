'use client';

export function setupAuthFetch(getToken: () => string | undefined) {
	if (typeof window === 'undefined') return;
	const w = window as any;
	if (w.__authFetchInstalled) return;
	w.__authFetchInstalled = true;

	const originalFetch = window.fetch.bind(window);

	window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
		try {
			const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
			const shouldAttach = url.startsWith('/api') || (process.env.NEXT_PUBLIC_API_BASE_URL && url.startsWith(process.env.NEXT_PUBLIC_API_BASE_URL));
			if (shouldAttach) {
				const token = getToken();
				if (token) {
					const headers = new Headers((init && init.headers) || {});
					if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
					return originalFetch(input, { ...init, headers });
				}
			}
		} catch (_) {
			// no-op fallthrough
		}
		return originalFetch(input, init);
	};
}


