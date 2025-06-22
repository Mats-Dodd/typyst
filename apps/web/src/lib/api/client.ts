export class APIClient {
	private pathCache = new Map<string, { id: string; timestamp: number }>();
	private readonly CACHE_TTL = 5 * 60 * 1000;

	private cleanCache() {
		const now = Date.now();
		for (const [path, data] of this.pathCache.entries()) {
			if (now - data.timestamp > this.CACHE_TTL) {
				this.pathCache.delete(path);
			}
		}
	}

	async resolvePath(path: string): Promise<string> {
		const cached = this.pathCache.get(path);
		if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
			return cached.id;
		}

		const { mappings } = await this.resolvePaths([path]);
		return mappings[path]!;
	}

	async resolvePaths(paths: string[]): Promise<{ mappings: Record<string, string> }> {
		this.cleanCache();

		const uncachedPaths: string[] = [];
		const mappings: Record<string, string> = {};

		for (const path of paths) {
			const cached = this.pathCache.get(path);
			if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
				mappings[path] = cached.id;
			} else {
				uncachedPaths.push(path);
			}
		}

		if (uncachedPaths.length > 0) {
			const response = await fetch('/api/resolve', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ paths: uncachedPaths })
			});

			if (!response.ok) {
				throw new Error(`Failed to resolve paths: ${response.statusText}`);
			}

			const { mappings: newMappings } = await response.json();

			const now = Date.now();
			for (const [path, id] of Object.entries(newMappings)) {
				if (!path || !id) {
					throw new Error(`Invalid path or id: ${path} ${id}`);
				}
				this.pathCache.set(path, { id: id as string, timestamp: now });
				mappings[path] = id as string;
			}
		}

		return { mappings };
	}

	async request<T>(url: string, options?: RequestInit): Promise<T> {
		const response = await fetch(url, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...options?.headers
			}
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ error: response.statusText }));
			throw new Error(error.error || response.statusText);
		}

		return response.json();
	}
}

export const apiClient = new APIClient();
