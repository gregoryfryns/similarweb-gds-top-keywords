/** @const - 6 hours (Google's max) minus 10s */
ChunkyCache.DEFAULT_TIMEOUT = 21590;

/** @const - 100 KB */
ChunkyCache.MAX_CACHE_SIZE = 100 * 1024;

/**
 * Constructor for ChunkyCache.
 * More info on caching: https://developers.google.com/apps-script/reference/cache/cache
 *
 * @param {any} cacheService - GDS caching service
 * @return {ChunkyCache} ChunkyCache.
 */
function ChunkyCache(cacheService, chunkSize) {
  this.service = cacheService;
  this.chunkSize = typeof(chunkSize) == 'undefined' ? ChunkyCache.MAX_CACHE_SIZE : chunkSize;

  return this;
}

/**
 * Stores a value under a specified key, with no restriction on the size of the data
 *
 * @param {string} key - Unique key under which the data will be stored
 * @param {any} value - Data to be stored. The data is stored as a JSON object in the cache service
 */
ChunkyCache.prototype.put = function (key, value, timeout) {
  if (typeof(timeout) == 'undefined') { timeout = ChunkyCache.DEFAULT_TIMEOUT; }
  var json = JSON.stringify(value);
  // var cSize = Math.floor(this.chunkSize / 2);
  var cSize = this.chunkSize;
  var chunks = [];
  var index = 0;
  while (index < json.length) {
    var cKey = key + '_' + index;
    chunks.push(cKey);
    this.service.put(cKey, json.substr(index, cSize), timeout + 5);
    index += cSize;
  }

  var superBlk = {
    chunkSize: this.chunkSize,
    chunks: chunks,
    length: json.length
  };

  try {
    this.service.put(key, JSON.stringify(superBlk), timeout);
    console.info('ChunkyCache: successfully stored data for key: ', key, ' (', chunks.length, 'chunks)');
  }
  catch (e) {
    console.error('Error when storing in cache', key, e);
  }
};

/**
 * Gets the data stored under a specified key
 *
 * @param {string} key - Unique key of the value to be retrieved
 * @return {any} Stored data, or null if no data found for this key
 */
ChunkyCache.prototype.get = function (key) {
  var service = this.service;
  var superBlkCache = service.get(key);
  var result = null;

  if (superBlkCache != null) {
    var superBlk = JSON.parse(superBlkCache);
    var chunks = superBlk.chunks.map(function (cKey) {
      return service.get(cKey);
    });
    if (chunks.every(function (c) { return c != null; })) {
      result = JSON.parse(chunks.join(''));
      console.info('ChunkyCache: successfully retrieved data for key: ', key);
    }
    else {
      console.error('ChunkyCache: Missing chunk for key: ', key);
    }
  }
  else {
    console.info('ChunkyCache: no data found for key: ', key);
    throw 'Key not found';
  }

  return result;
};

/**
 * Generates a unique key for a specified SimilarWeb API endpoint and set of parameters (in any order)
 *
 * @param {string} url - URL to the endpoint (with or without parameters)
 * @param {?object} params - object containing the HTTP GET parameters (if not already specified in the url)
 */
ChunkyCache.prototype.buildCacheKey = function(url, params) {
  if (typeof(params) == 'undefined') {
    var split = url.split('?');
    url = split[0];
    params = {};
    if (split[1]) {
      split[1].split('&').forEach(function(p) {
        var keyVal = p.split('=');
        params[keyVal[0]] = keyVal[1];
      });
    }
  }

  function shortenKey(key) {
    var shortKeys = {
      'country': 'c',
      'domain': 'd',
      'end_date': 'ed',
      'start_date': 'sd',
      'granularity': 'g',
      'main_domain_only': 'md'
    };

    return shortKeys[key] || key;
  }

  var parString = Object.keys(params)
    .filter(function(key) { return  ['api_key', 'format', 'show_verified'].indexOf(key) < 0; })
    .sort().map(function(key) {return shortenKey(key) + '=' + params[key];})
    .join('&');

  var result = url.replace(/^https:\/\/api\.similarweb\.com\/v\d+\/(website|keywords)\//, '') + '?' + parString;

  return result;
};

/* global exports */
/* istanbul ignore next */
if (typeof(exports) !== 'undefined') {
  exports['__esModule'] = true;
  exports['default'] = ChunkyCache;
}
