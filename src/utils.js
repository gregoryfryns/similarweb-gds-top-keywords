/* global CacheService, UrlFetchApp */

if (typeof(require) !== 'undefined') {
  var DataCache = require('./DataCache.js')['default'];
}

/**
 * Tries to retrieve the requested data from the cache, and calls the API if not successful
 *
 * @param {string} url - url to the desired API endpoint
 * @param {?object} params - object that contains the URL parameters and their values
 * @return {object} - Results, or null if the API call wasn't successful
 */

/* istanbul ignore next */
function retrieveOrGet(url, params) {
  if (typeof params === 'undefined') { params = {}; }

  var cache = new DataCache(CacheService.getUserCache(), url, params);
  var data;

  try {
    var dataString = cache.get();
    data = JSON.parse(dataString);
    console.log('Fetched succesfully from cache', cache.cacheKey);
  }
  catch (e) {
    console.log('Error when fetching from cache:', cache.cacheKey, e);
  }

  if (!data) {
    data = httpGet(url, params);
    if (data) {
      try {
        cache.set(JSON.stringify(data));
      }
      catch (e) {
        console.log('Error when storing in cache', cache.cacheKey, e);
      }
    }
  }

  return data;
}

/**
 * Send a HTTP GET request to an API endpoint and return the results in a JavaScript object
 *
 * @param {string} url - url to the desired API endpoint
 * @param {object} params - object that contains the URL parameters and their values
 * @return {object} Results returned by the API, or null if the API call wasn't successful
 */

/* istanbul ignore next */
function httpGet(url, params) {
  var urlParams = Object.keys(params).map(function(k) {return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
  var fullUrl = url + (urlParams.length > 0 ? '?' + urlParams : '');

  console.log('Fetching', fullUrl.replace(/api_key=[0-9a-f]{26}/gi, 'api_key=xxxxxxxxxxx'));
  var response = UrlFetchApp.fetch(fullUrl, { 'muteHttpExceptions': true });
  console.log('Response', response);

  var data = null;

  try {
    data = JSON.parse(response);
  }
  catch (e) {
    console.log('Could not parse response', response, e);
  }

  return data;
}

/**
 * Extracts the month from a date formatted as YYYY-MM-DD
 *
 * @param {string} dateString - date formatted as YYYY-MM-DD
 * @return {string} Month, formatted as YYYY-MM
 */
function dateToYearMonth(dateString) {
  return dateString.split('-').slice(0, 2).join('-');
}

/* global exports */
if (typeof(exports) !== 'undefined') {
  exports['__esModule'] = true;
  exports['retrieveOrGet'] = retrieveOrGet;
  exports['dateToYearMonth'] = dateToYearMonth;
}
