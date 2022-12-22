import { TypedEmitter } from 'tiny-typed-emitter';
import { Awaitable, If, ResOrArray as RestOrArray, normalizeArray } from 'fallout-utility';
import { Collection } from '@discordjs/collection';
import { UrlJsonContent, UrlJsonContentOptions } from './UrlJsonContent';

export interface DiscordScamLinksOptions {
    /**
     * Fetch domain arrays from url
     */
    fetchJsonFromUrl: string|(string|{ url: string; dataParser: (data: any) => Awaitable<string[]>; })[];
    /**
     * Max cached domains age
     */
    maxCacheAgeMs: number;
    /**
     * Refresh cache interval
     */
    refreshCacheEveryMs: number;
}

export interface DiscordScamLinksEvents {
    error: (error: Error) => Awaitable<void>;
    cacheRefresh: () => Awaitable<void>;
}

export class DiscordScamLinks<Ready extends boolean = boolean> extends TypedEmitter<DiscordScamLinksEvents> {
    private _options?: Partial<DiscordScamLinksOptions>;
    private _ready: boolean = false;

    protected _cache: Collection<string, UrlJsonContent> = new Collection();
    protected _refreshCacheInterval?: NodeJS.Timer;
    protected _maxCacheAge: number = 60000 * 20;

    readonly addedDomains: string[] = [];

    get cache() { return this._cache as Collection<string, If<Ready, UrlJsonContent<any, true>, UrlJsonContent>>; }
    get maxCacheAge() { return this._options?.maxCacheAgeMs ?? this._maxCacheAge; }
    get allDomains() { return [...this.addedDomains, ...this.cache.filter(cached => cached.isFetched()).map(cached => cached.content!).reduce((prev, current) => [...prev, ...current])] }

    constructor(options?: Partial<DiscordScamLinksOptions>) {
        super();
        this._options = options;

        (typeof options?.fetchJsonFromUrl === 'string' ? [options.fetchJsonFromUrl] : options?.fetchJsonFromUrl)?.forEach(url => typeof url === 'string'
            ? this.fetchJsonFromUrl(url)
            : this.fetchJsonFromUrl(url.url, { dataParser: url.dataParser })
        ); 
    }

    /**
     * Refresh cached domains
     * @param checkCacheAge Only refresh cached domains older than max cache age
     */
    public async refreshCache(checkCacheAge: boolean = true): Promise<void> {
        if (!this._ready) this._ready = true;

        await Promise.all(this.cache.map(async cached => {
            if (!cached.isFetched() || (!checkCacheAge || (Date.now() - cached.lastFetch.getTime()) >= this.maxCacheAge)) {
                await cached.fetch().catch(err => this.emit('error', err));
            }

            return cached;
        }));

        if (!this._refreshCacheInterval) {
            this._refreshCacheInterval = setInterval(async () => this.refreshCache(true), this._options?.refreshCacheEveryMs ?? 60000 * 5);
        }

        this.emit('cacheRefresh');
    }

    /**
     * Fetch domains from url
     * @param url Domains json url
     * @param options Fetch options
     */
    public async fetchJsonFromUrl<ResponseData = string[]>(url: string, options?: UrlJsonContentOptions<ResponseData> & { dontCache?: boolean; }): Promise<UrlJsonContent<ResponseData, true>> {
        const data = new UrlJsonContent(url, options);

        await data.fetch();
        if (!options?.dontCache) this.cache.set(url, data as any);

        return data;
    }

    /**
     * Add static domain
     * @param domains Domains to add
     */
    public addDomain(...domains: RestOrArray<string>): this {
        this.addedDomains.push(...normalizeArray(domains));
        return this;
    }

    /**
     * Set cache max age
     * @param maxCacheAgeMs Cache max age
     */
    public setMaxCacheAge(maxCacheAgeMs: number): this {
        this._options = {
            ...(this._options ?? {}),
            maxCacheAgeMs
        };

        return this;
    }

    /**
     * Check if data contains any stored domains
     * @param data String data to check
     * @param refreshCache Refresh cache before checking
     */
    public isMatch(data: string, refreshCache: false): boolean;
    public isMatch(data: string, refreshCache: true): Promise<boolean>;
    public isMatch(data: string, refreshCache: boolean = false): Promise<boolean>|boolean {
        data = data.toLowerCase();

        if (refreshCache) {
            return (async () => {
                await this.refreshCache();
                return this.allDomains.some(domain => data.includes(domain.toLowerCase()));
            })();
        }

        return this.allDomains.some(domain => data.includes(domain.toLowerCase()));
    }

    /**
     * Check if cache is fetched
     */
    public isReady(): this is DiscordScamLinks<true> {
        return this._ready;
    }
}