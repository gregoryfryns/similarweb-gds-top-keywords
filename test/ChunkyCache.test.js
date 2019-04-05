var ChunkyCache = require('../src/ChunkyCache.js')['default'];

/**
 * Emulate Cache Service
 */
class UserCache {
  constructor () {
    this.cacheDict = {};
  }
  get(key) {
    return this.cacheDict[key];
  }

  // eslint-disable-next-line no-unused-vars
  put(key, value, expiration) {
    this.cacheDict[key] = value;
  }

  remove(key) {
    delete this.cacheDict[key];
  }
}

function generateData(arraySize) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < arraySize; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}

test('Test Cache', () => {
  var cacheService = new UserCache();
  var cache = new ChunkyCache(cacheService);

  var url = 'https://api.similarweb.com/v1/website/xxx/total-traffic-and-engagement/visits';
  var params = {
    api_key: '0123456789abcdef0123456789abcdef',
    country: 'world',
    domain: 'toto.com',
    main_domain_only: 'false',
    show_verified: 'false',
    format: 'json'
  };

  var cacheKey = cache.buildCacheKey(url, params);
  cache.put(cacheKey, 'my_data');
  expect(cache.get(cacheKey)).toBe('my_data');
});

test('Test Fulll URL', () => {
  var cacheService = new UserCache();
  var cache = new ChunkyCache(cacheService);

  var url = [
    'https://api.similarweb.com/v1/website/xxx/total-traffic-and-engagement/visits',
    '?api_key=0123456789abcdef0123456789abcdef',
    '&country=world',
    '&domain=toto.com',
    '&main_domain_only=false',
    '&show_verified=false',
    '&format=json'
  ].join('');

  var cacheKey = cache.buildCacheKey(url);
  cache.put(cacheKey, 'my_data');
  expect(cache.get(cacheKey)).toBe('my_data');
});

test('Test Cache Chunks', () => {
  var cacheService = new UserCache();
  var cache = new ChunkyCache(cacheService);

  var url = 'https://api.similarweb.com/v1/website/xxx/total-traffic-and-engagement/visits';
  var params = {
    api_key: '0123456789abcdef0123456789abcdef',
    country: 'world',
    domain: 'toto.com',
    main_domain_only: 'false',
    show_verified: 'false',
    format: 'json'
  };

  var data = generateData(Math.max((3 * 100 * 1024) - 10), 1);
  var cacheKey = cache.buildCacheKey(url, params);

  cache.put(cacheKey, data);
  expect(cache.get(cacheKey)).toBe(data);
});

test('No API key in cache key', () => {
  var cacheService = new UserCache();
  var cache = new ChunkyCache(cacheService);

  var url = 'https://api.similarweb.com/v1/website/xxx/total-traffic-and-engagement/visits';
  var params = {
    api_key: '0123456789abcdef0123456789abcdef',
    country: 'world',
    domain: 'toto.com',
    main_domain_only: 'false',
    show_verified: 'false'
  };

  var cacheKey = cache.buildCacheKey(url, params);
  var reApiKey = /api_key=[0-9a-f]{32}/gi;
  expect(reApiKey.test(cacheKey)).toBeFalsy();
});

test('No show_verified in cache key', () => {
  var cacheService = new UserCache();
  var cache = new ChunkyCache(cacheService);

  var url = 'https://api.similarweb.com/v1/website/xxx/total-traffic-and-engagement/visits';
  var params = {
    api_key: '0123456789abcdef0123456789abcdef',
    country: 'world',
    domain: 'toto.com',
    main_domain_only: 'false',
    show_verified: 'false'
  };

  var cacheKey = cache.buildCacheKey(url, params);
  var reApiKey = /show_verified=(?:true|false)/gi;
  expect(cacheKey).toEqual(expect.not.stringMatching(reApiKey));
});

test('Cache Key - Shortened params', () => {
  var cacheService = new UserCache();
  var cache = new ChunkyCache(cacheService);

  var url = 'https://api.similarweb.com/v1/website/xxx/total-traffic-and-engagement/visits';
  var params = {
    api_key: '0123456789abcdef0123456789abcdef',
    country: 'world',
    domain: 'toto.com',
    start_date: '2018-01',
    end_date: '2018-12',
    granularity: 'monthly',
    main_domain_only: 'false',
    show_verified: 'false',
    format: 'json'
  };

  var cacheKey = cache.buildCacheKey(url, params);
  // check if all parameters are there and that the new key is max 2 chars long
  Object.keys(params)
    .filter(function(key) { return  ['api_key', 'format', 'show_verified'].indexOf(key) < 0; })
    .forEach(function(key) {
      var val = params[key];
      var reExtractKey = new RegExp('.*[?&](\\w+)=' + val + '\\b', 'i');
      var match = cacheKey.match(reExtractKey);
      expect(match).not.toBeFalsy();
      expect(match[1].length).toBeLessThanOrEqual(2);
    });
});
