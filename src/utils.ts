import { SimilarwebApiReply, CapabilitiesReply } from './types/similarweb-api';

/**
 * Takes a domain name, strips off the protocol (http/https), www. and folder, and make it URL safe
 *
 * @param domain Domain name to be cleaned
 * @return Domain name stripped from the unnecessary elements
 */
export function cleanDomain(domain: string): string {
  return encodeURIComponent(domain.trim().replace(/^(?:https?:\/\/)?(?:www\.)?/ig, '').replace(/\/.*$/ig, '').toLowerCase());
}

/**
 * Extracts the month from a date formatted as YYYY-MM-DD
 *
 * @param dateString Date formatted as YYYY-MM-DD
 * @return Month, formatted as YYYY-MM
 */
export function dateToYearMonth(dateString: string): string {
  return dateString.split('-').slice(0, 2).join('-');
}

export interface UrlDataMap {
  [propName: string]: SimilarwebApiReply;
}

class ChunkyCache {
  private static TIMEOUT: number = 21600; // 6 hours
  private static CHUNK_SIZE: number = 50 * 1024; // max 100kb, 2 bytes per character
  private static cacheService: GoogleAppsScript.Cache.Cache;

  private static instance: ChunkyCache; // singleton

  private constructor() {
    ChunkyCache.cacheService = CacheService.getUserCache();
  }

  public static getInstance(): ChunkyCache {
    if (!ChunkyCache.instance) {
      ChunkyCache.instance = new ChunkyCache();
    }
    return ChunkyCache.instance;
  }

  private static chunkify(key: string, value: object): object {
    const stringifiedValue = JSON.stringify(value);
    const result = {};
    if (stringifiedValue.length < ChunkyCache.CHUNK_SIZE) {
      result[key] = stringifiedValue;
    }
    else {
      let index = 0;
      while (index * ChunkyCache.CHUNK_SIZE < stringifiedValue.length) {
        const chunkKey = key + '_' + index;
        const startIndex = index * ChunkyCache.CHUNK_SIZE;
        result[chunkKey] = stringifiedValue.substr(startIndex, ChunkyCache.CHUNK_SIZE);
        index++;
      }

      const chunksDict = {
        isChunkified: true,
        chunks: Object.keys(result)
      };
      result[key] = JSON.stringify(chunksDict);
    }
    // console.log('ChunkyCache: ', key, ' broken into ', Object.keys(result).length, ' pieces');

    return result;
  }

  private static buildKeyFromUrl(url: string, params?: object): string {
    url = url.toLowerCase();
    if (typeof(params) === 'undefined') {
      const split = url.split('?');
      url = split[0];
      params = {};
      split[1].split('&').forEach(function(param): void {
        const [key, val] = param.split('=');
        params[key] = val;
      });
    }

    function isParamIncluded(param: string): boolean {
      const excludedParams = [
        'api_key',
        'format',
        'show_verified'
      ];

      return excludedParams.indexOf(param) < 0;
    }

    function shortenKey(param: string): string {
      const shortParams = {
        'country': 'c',
        'domain': 'd',
        'end_date': 'ed',
        'start_date': 'sd',
        'granularity': 'g',
        'main_domain_only': 'md',
        'show_verified': 'sv',
        'mode': 'm',
        'device': 'dv',
        'category': 'ca'
      };

      return shortParams[param] || param;
    }

    const parString = Object.keys(params)
      .filter(isParamIncluded)
      .sort()
      .map((key): string => `${shortenKey(key)}=${params[key]}`)
      .join('&');
    const shortenedUrl = url.replace(/^https:\/\/api\.similarweb\.com\/v\d+\/(website|keywords|app)\//, '');

    return `${shortenedUrl}?${parString}`;
  }

  /**
   * Takes a key and a value, and stores them in the cache with no restriction on
   * the data size.
   *
   * @param fullUrl URL whose data we want to store
   * @param value Value returned by the API
   */
  public put(fullUrl: string, value: object): void {
    const key = ChunkyCache.buildKeyFromUrl(fullUrl);
    const chunkified = ChunkyCache.chunkify(key, value);
    try {
      ChunkyCache.cacheService.putAll(chunkified, ChunkyCache.TIMEOUT);
    }
    catch (e) {
      console.error('ChunkyCache: error storing the data for key: ', key, ' - ', e);
    }

    console.log('ChunkyCache: successfully stored data for key: ', key, ' (', Object.keys(chunkified).length, ' chunks)');
  }

  /**
   * Takes an object of URLs/values and stores each of them in the cache, with no restriction on
   * the data size.
   *
   * @param dict Object mapping the URLs and values to be stored
   */
  public putAll(dict: UrlDataMap): void {
    console.log('ChunkyCache: storing values for ', Object.keys(dict).length, ' urls');
    // chunkify data and store everything in one dict
    const chunkifiedDict = {};
    Object.keys(dict).forEach((url: string): void => {
      const key = ChunkyCache.buildKeyFromUrl(url);
      const chunkifiedVal = ChunkyCache.chunkify(key, dict[url]);
      Object.keys(chunkifiedVal).forEach((chunkKey: string): void => {
        chunkifiedDict[chunkKey] = chunkifiedVal[chunkKey];
      });
    });

    try {
      ChunkyCache.cacheService.putAll(chunkifiedDict, ChunkyCache.TIMEOUT);
    }
    catch (e) {
      console.warn('ChunkyCache: error storing the data for multiple keys - ', e);
    }
  }

  /**
   * Takes a single URL and returns the value stored for that URL, or null if not found
   *
   * @param fullUrl URL (with parameters)
   * @return Data returned after the last successful API call
   */
  public get(fullUrl: string): object {
    const key = ChunkyCache.buildKeyFromUrl(fullUrl);
    console.log('ChunkyCache: getting data for key', key);
    let result;
    try {
      const data = ChunkyCache.cacheService.get(key);

      if (data) {
        result = JSON.parse(data);
        if (result.isChunkified) {
          if (!result.chunks) {
            console.error('ChunkyCache: Could not retrieve the chunks for ', key);
            result = null;
          }
          const chunksDict = ChunkyCache.cacheService.getAll(result.chunks);
          const chunks = result.chunks.map((key: string): string => chunksDict[key]);
          result = chunks ? JSON.parse(chunks.join('')) : null;
        }
        console.log('ChunkyCache: data retrieved successfully for ', key);
      }
      else {
        console.log('ChunkyCache: No data found for ', key);
      }
    }
    catch (e) {
      console.log('ChunkyCache: Could not retrieve data for key', key, ' - ', e);
    }

    return result;
  }

  /**
   * Takes a list of URLs and returns the values stored in cache for each of them. The items not present
   * in hte cache will not be returned in the reply.
   *
   * @param urls List of URLs to be called (with parameters)
   * @return Object mapping the urls with the returned data when available
   */
  public getAll(urls: string[]): UrlDataMap {
    console.log('ChunkyCache: getting data for ', urls.length, ' urls');
    let cacheData;
    const result: UrlDataMap = {};

    const keys = urls.map((url: string): string => ChunkyCache.buildKeyFromUrl(url));

    try {
      cacheData = ChunkyCache.cacheService.getAll(keys);
    }
    catch (e) {
      console.error('ChunkyCache: Could not get chunks keys - ', e);
    }

    const urlChunksKeysMap: [string, string[]][] = [];
    if (cacheData) {
      urls.filter((url: string): boolean => cacheData.hasOwnProperty(ChunkyCache.buildKeyFromUrl(url)))
        .forEach((url: string): void => {
          const key = ChunkyCache.buildKeyFromUrl(url);
          const data = JSON.parse(cacheData[key]);

          if (data.isChunkified) {
            urlChunksKeysMap.push([url, data.chunks]);
          }
          else {
            result[url] = data;
          }
        });
    }

    const chunksKeys = [].concat(...urlChunksKeysMap.map((chunkData): string[] => chunkData[1]));

    let chunksData = {};
    try {
      chunksData = ChunkyCache.cacheService.getAll([].concat(...chunksKeys));

      urlChunksKeysMap.forEach((x: [string, string[]]): void => {
        const [url, chunks] = x;
        const mergedData = chunks.map((chunkKey: string): string => chunksData[chunkKey]).join('');
        result[url] = JSON.parse(mergedData) as SimilarwebApiReply;
      });
    }
    catch (e) {
      console.warn('ChunkyCache: Could not get chunks data - ', e);
    }

    return result;
  }
}

/**
 * Takes an endpoint URL and an object with the parameters to be added to the HTTP GET request,
 * and returns the full URL with the appended parameters
 *
 * @param url URL to the desired enpoint, without parameters
 * @param params Object with the parameters to be passed in the HTTP GET request
 * @return Full URL with the parameters appended to the endpoint name
 */
export function buildUrl(url: string, params: object = {}): string {
  if (url.indexOf('?') > 0) {
    console.warn('buildUrl: url already does have parameters:', url);
    return url;
  }
  const urlParams = Object.keys(params).map((k): string => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  const fullUrl = url + (urlParams.length > 0 ? '?' + urlParams : '');

  return fullUrl;
}

/**
 * Send a HTTP GET request to an API endpoint and return the results in a JavaScript object
 *
 * @param url URL to be called (either with or without parameters)
 * @param params Object that contains the URL parameters and their values
 * @param retries Number of subsequent retries to perform if the API call fails, default 3
 * @return Results returned by the API, or null if the API call wasn't successful
 */
export function httpGet(url: string, params: object = {}, retries: number = 3): SimilarwebApiReply {
  const fullUrl = buildUrl(url, params);
  console.log('httpGet: Fetching', fullUrl.replace(/api_key=[0-9a-f]{26}/gi, 'api_key=xxxxxxxxxxx'));

  let response: GoogleAppsScript.URL_Fetch.HTTPResponse; // eslint-disable-line @typescript-eslint/camelcase
  let data: SimilarwebApiReply = null;

  try {
    response = UrlFetchApp.fetch(fullUrl);
  }
  catch (e) {
    if (retries > 0) {
      console.warn(`Could not get data from API (${retries} attempts left) - `, e);
      data = httpGet(url, params, retries - 1);
    }
    else {
      DataStudioApp.createCommunityConnector()
        .newUserError()
        .setDebugText(`httpGet: Could not retrieve the data for url: ${url} - error: ${e}`)
        .setText(`An error has occurred when contacting the Similarweb API, please contact the developers to fix the problem.`)
        .throwException();
    }
  }
  console.log('httpGet: Retrieved data successfully');

  try {
    data = JSON.parse(response.getContentText());
  }
  catch (e) {
    DataStudioApp.createCommunityConnector()
      .newUserError()
      .setDebugText(`httpGet: error parsing the JSON for url: ${url} - error: ${e}`)
      .setText(`An error has occurred when contacting the Similarweb API, please contact the developers to fix the problem.`)
      .throwException();
  }
  return data;
}

/**
 * Tries to retrieve the requested data from the cache, and calls the API if not successful
 *
 * @param url URL to be called (either with or without parameters)
 * @param params Object that contains the URL parameters and their values
 * @return Results, or null if the API call wasn't successful
 */
export function retrieveOrGet(url: string, params: object = {}): SimilarwebApiReply {
  const cache = ChunkyCache.getInstance();
  const fullUrl = buildUrl(url, params);
  let data: SimilarwebApiReply;

  data = cache.get(fullUrl) as SimilarwebApiReply;

  if (!data) {
    data = httpGet(url, params);
    if (data) {
      try {
        cache.put(fullUrl, data);
      }
      catch (e) {
        console.warn('retrieveOrGet: Error when storing in cache - ', url, e);
      }
    }
  }

  return data;
}

/**
 * Takes a list of URLs and returns the HTTP GET response for each of them. All the successful results
 * are stored in the cache.
 *
 * @param urls List of URLs to be called
 * @param batchSize Number of urls to be processed at a time (will retrieve at most 1 batch per second)
 * @param retries Number of times the HTTP GET call will be retried if unsuccessful
 * @return Object mapping the urls with the returned data (or null if no data could be retrieved for the url)
 */
export function httpGetAll(urls: string[], batchSize: number = 4, retries: number = 3): UrlDataMap {
  console.log('httpGetAll: calling API for ', urls.length, 'urls - ', retries, ' retries left');
  const cache = ChunkyCache.getInstance();
  const waitlist = urls.slice(0); // clone array
  const result = {};
  const missed = [];
  let batchNum = 1;
  const nbBatches = 1 + Math.floor(waitlist.length / batchSize);

  while (waitlist.length > 0) {
    if (nbBatches > 1) { console.log(`httpGetAll: running batch ${batchNum} of ${nbBatches}`); }
    const batch = waitlist.splice(0, batchSize); // take the *batchSize* first elements of the urls list
    const requests = batch.map((url: string): object => ({ 'url': url, 'method': 'get', 'muteHttpExceptions': true }));

    let responses: GoogleAppsScript.URL_Fetch.HTTPResponse[]; // eslint-disable-line @typescript-eslint/camelcase
    const startTime = new Date();
    try {
      responses = UrlFetchApp.fetchAll(requests);
    }
    catch (e) {
      console.warn('httpGetAll: error retrieving batch data - ', e);
      missed.concat(batch);
    }

    if (responses) {
      const batchResults = {};
      responses.forEach((response, i): void => {
        const url = batch[i];
        let data;
        if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
          try {
            data = JSON.parse(response.getContentText()) as SimilarwebApiReply;
          }
          catch (e) {
            console.warn('httpGetAll: error parsing data for url: ', url, ' - ', e);
            data = null;
          }

          result[url] = data;
          batchResults[url] = data;
        }
        else {
          console.warn('httpGetAll: http error for url ', url, ' - response code: ', response.getResponseCode());
          missed.push(url);
        }
      });

      const nbSuccessfulResults = Object.keys(batchResults).length;
      if (cache && nbSuccessfulResults > 0) {
        cache.putAll(batchResults);
      }
    }

    // If less than a second has elapsed, wait before running next batch
    const endTime = new Date();
    const timeDiff = endTime.getTime() - startTime.getTime();
    if (timeDiff < 1000) {
      // console.log(`httpGetAll: wait ${1000 - timeDiff} ms before next batch`);
      Utilities.sleep(1000 - timeDiff);
    }

    batchNum++;
  }

  if (missed.length > 0) {
    if (retries > 0) {
      console.log('httpGetAll: ', missed.length, ' failed requests, ', retries, ' retries left');
      const retryResults = httpGetAll(missed, batchSize, retries - 1);
      Object.keys(retryResults).forEach((url: string): void => {
        result[url] = retryResults[url];
      });
    }
    else {
      DataStudioApp.createCommunityConnector()
        .newUserError()
        .setDebugText(`httpGet: Could not retrieve the data for ${missed.length} urls: ${JSON.stringify(missed).slice(0, 1000)}`)
        .setText(`An error has occurred when contacting the Similarweb API, please contact the developers to fix the problem.`)
        .throwException();    }
  }

  return result;
}

/**
 * Takes a list of URLs and returns the HTTP GET response for each of them, retrieving them from the cache
 * when possible or by calling the API otherwise.
 *
 * @param urls List of URLs to be called
 * @param batchSize Number of urls to be processed at a time (will retrieve at most 1 batch per second)
 * @param retries Number of times the HTTP GET call will be retried if unsuccessful
 * @return Object mapping the urls with the returned data (or null if no data could be retrieved for the url)
 */
export function retrieveOrGetAll(urls: string[], batchSize: number = 10): UrlDataMap {
  console.log(`retrieveOrGetAll: getting data for ${urls.length} URLs`);
  const cache = ChunkyCache.getInstance();
  const result = cache.getAll(urls);

  const missed = urls.filter((url: string): boolean => (!result.hasOwnProperty(url) || !result[url]));
  console.log(`retrieveOrGetAll: retrieved data for ${urls.length - missed.length}/${urls.length} URLs in the cache`);

  if (missed.length > 0) {
    const apiResponses = httpGetAll(missed, batchSize);

    missed.forEach((url: string): void => {
      result[url] = apiResponses[url] || null;
    });
  }

  return result;
}

export class Set {
  private set = {};

  public constructor(values: string[] = []) {
    values.forEach((value): void => { this.set[value] = true; });
  }

  public add(value: string | string[]): Set {
    if (value instanceof Array) {
      value.forEach((val): void => {this.set[val]; });
    }
    else {
      this.set[value] = true;
    }
    return this;
  }

  public getValues(): string[] {
    return Object.keys(this.set);
  }
}

export enum EndpointType {
  WebDesktopData = 'web_desktop_data',
  WebMobileData = 'web_mobile_data',
  AppData = 'app_data',
  AppEngagmentData = 'app_engagement_data'
}

export class ApiConfiguration {
  private static capData: CapabilitiesReply;
  private static apiKey: string;
  private static instance: ApiConfiguration;

  private constructor() {
  }

  public static getInstance(): ApiConfiguration {
    if (!ApiConfiguration.instance) {
      ApiConfiguration.instance = new ApiConfiguration();
    }

    return ApiConfiguration.instance;
  }

  public setApiKey(apiKey: string): void {
    ApiConfiguration.apiKey = apiKey;
    ApiConfiguration.capData = retrieveOrGet('https://api.similarweb.com/capabilities', { 'api_key': apiKey }) as CapabilitiesReply;
  }

  public hasApiKey(): boolean {
    return !!ApiConfiguration.apiKey;
  }

  /**
   * Returns the default parameters for the API request, including the start and
   * end dates, based on the API key access rights. Returns null country is not available.
   * @param endpointType Type of the endpoint you want to get the parameters for
   * @param country 2-letter ISO country code, or 'world' for Worldwide
   */
  public getDefaultParams(endpointType: EndpointType, country: string): object {
    const capData = ApiConfiguration.capData;
    const params = {
      'api_key': ApiConfiguration.apiKey,
      'country': country,
      'granularity': 'monthly',
      'main_domain_only': 'false',
      'show_verified': 'false'
    };
    if (!capData.hasOwnProperty(endpointType)) {
      DataStudioApp.createCommunityConnector()
        .newUserError()
        .setDebugText(`Invalid Endpoint Type : ${endpointType}`)
        .setText(`An error has occurred, please contact the developers to fix the problem.`)
        .throwException();
    }

    // Check if the country is available for the selected API key
    if (capData[endpointType].countries.some((c): boolean => c.code.toLowerCase() === country)) {
      params['start_date'] = dateToYearMonth(capData[endpointType].snapshot_interval.start_date);
      params['end_date'] = dateToYearMonth(capData[endpointType].snapshot_interval.end_date);
    }
    else {
      return null;
    }

    return params;
  }

  public getInterval(endpointType: EndpointType): { 'startDate': string; 'endDate': string } {
    const capData = ApiConfiguration.capData;
    if (!capData.hasOwnProperty(endpointType)) {
      DataStudioApp.createCommunityConnector()
        .newUserError()
        .setDebugText(`Invalid Endpoint Type : ${endpointType}`)
        .setText(`An error has occurred, please contact the developers to fix the problem.`)
        .throwException();
    }

    return {
      'startDate': capData[endpointType].snapshot_interval.start_date,
      'endDate': capData[endpointType].snapshot_interval.end_date
    };
  }
}
