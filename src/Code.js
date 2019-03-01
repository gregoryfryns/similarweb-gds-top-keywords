/* global CacheService, UrlFetchApp, DataStudioApp, Session */

if (typeof(require) !== 'undefined') {
  var DataCache = require('./DataCache.js')['default'];
}

// eslint-disable-next-line no-unused-vars
function getAuthType(request) {
  var response = { type: 'NONE' };
  return response;
}

// eslint-disable-next-line no-unused-vars
function getConfig() {
  var cc = DataStudioApp.createCommunityConnector();
  var config = cc.getConfig();

  config.newInfo()
    .setId('instructions')
    .setText('You can find your SimilarWeb API key or create a new one here (a SimilarWeb Pro account is needed): https://account.similarweb.com/#/api-management');

  config.newTextInput()
    .setId('apiKey')
    .setName('Your SimilarWeb API key')
    .setHelpText('Enter your 32-character SimilarWeb API key')
    .setPlaceholder('1234567890abcdef1234567890abcdef');

  config.newTextInput()
    .setId('domains')
    .setName('Domains')
    .setHelpText('Enter the name of up to 5 domains you would like to analyze, separated by commas (e.g. cnn.com, bbc.com, nytimes.com)')
    .setPlaceholder('cnn.com, bbc.com, nytimes.com')
    .setAllowOverride(true);

  config.newTextInput()
    .setId('country')
    .setName('Country Code')
    .setHelpText('ISO 2-letter country code of the country (e.g. us, gb - world for Worldwide)')
    .setPlaceholder('us')
    .setAllowOverride(true);

  config.newTextInput()
    .setId('limit')
    .setName('Limit')
    .setHelpText('Amount of keywords to be returned for each site (max. 9000)')
    .setPlaceholder('2000')
    .setAllowOverride(true);

  config.setDateRangeRequired(true);

  return config.build();
}

// eslint-disable-next-line no-unused-vars
function getConnectorFields() {
  var cc = DataStudioApp.createCommunityConnector();
  var fields = cc.getFields();
  var types = cc.FieldType;
  // var aggregations = cc.AggregationType;

  fields.newDimension()
    .setId('domain')
    .setName('Domain')
    .setGroup('Dimensions')
    .setType(types.TEXT);

  fields.newDimension()
    .setId('search_term')
    .setName('Search Term')
    .setGroup('Dimensions')
    .setType(types.TEXT);

  fields.newDimension()
    .setId('organic_paid')
    .setName('Organic/Paid')
    .setGroup('Dimensions')
    .setType(types.TEXT);

  fields.newMetric()
    .setId('visits')
    .setName('Visits')
    .setDescription('SimilarWeb estimated number of visits')
    .setType(types.NUMBER);

  // fields.newMetric()
  //   .setId('bounce_rate')
  //   .setName('Bounce rate')
  //   .setDescription('Rate of visits for which no other interaction has been detected 30 minutes after the user first accessed the page')
  //   .setType(types.PERCENT)
  //   .setFormula('sum($bounced_visits)/sum($visits)');

  fields.setDefaultDimension('domain');
  fields.setDefaultMetric('visits');

  return fields;
}

// eslint-disable-next-line no-unused-vars
function getSchema(request) {
  var fields = getConnectorFields().build();
  return { schema: fields };
}

// eslint-disable-next-line no-unused-vars
function getData(request) {
  var MAX_NB_DOMAINS = 5;
  var MAX_NB_KW = 9000;

  var startDate = request.dateRange.startDate;
  var endDate = request.dateRange.endDate;
  var country = request.configParams.country.trim().toLowerCase();
  var apiKey = request.configParams.apiKey.trim().toLowerCase();
  var limit = Math.min(request.configParams.limit, MAX_NB_KW);
  var domains = request.configParams.domains.split(',').slice(0, MAX_NB_DOMAINS).map(function(domain) {
    return domain.trim().replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').replace(/\/.*$/i, '').toLowerCase();
  });

  var requestedFieldIDs = request.fields.map(function(field) {
    return field.name;
  });
  console.log('requested fields ids', JSON.stringify(requestedFieldIDs));
  var requestedFields = getConnectorFields().forIds(requestedFieldIDs);

  var organicUrl = 'https://api.similarweb.com/v1/website/xxx/traffic-sources/organic-search';
  var paidUrl = 'https://api.similarweb.com/v1/website/xxx/traffic-sources/paid-search';

  var tabularData = [];

  var params = {
    api_key: apiKey,
    country: country,
    start_date: startDate,
    end_date: endDate,
    limit: limit,
    main_domain_only: 'false',
    show_verified: 'false',
    format: 'json'
  };

  domains.forEach(function(domain) {
    params['domain'] = domain;

    var organicData = retrieveOrGet(organicUrl, params);
    var paidData = retrieveOrGet(paidUrl, params);
    var organicVisits = organicData && organicData.visits ? organicData.visits : 0;
    var paidVisits = paidData && paidData.visits ? paidData.visits : 0;
    var totVisits = organicVisits + paidVisits;

    if (organicData && organicData.search) {
      organicData.search.forEach(function(srch) {
        tabularData.push({ values: buildRow(requestedFields, domain, srch.search_term, 'Organic', totVisits * srch.share) });
      });
    }

    if (paidData && paidData.search) {
      paidData.search.forEach(function(srch) {
        tabularData.push({ values: buildRow(requestedFields, domain, srch.search_term, 'Paid', totVisits * srch.share) });
      });
    }
  });

  return {
    schema: requestedFields.build(),
    rows: tabularData
  };
}

// eslint-disable-next-line no-unused-vars
function isAdminUser() {
  var adminUsersWhitelist = [
    'gregory.fryns@similarweb.com',
    'gregory.fryns@gmail.com'
  ];
  var email = Session.getEffectiveUser().getEmail();
  return adminUsersWhitelist.indexOf(email) > -1;
}

// eslint-disable-next-line no-unused-vars
function throwError (message, userSafe) {
  if (userSafe) {
    message = 'DS_USER:' + message;
  }
  throw new Error(message);
}

function buildRow(requestedFields, dom, searchTerm, organicOrPaid, value) {
  var row = [];
  requestedFields.asArray().forEach(function (field) {
    switch (field.getId()) {
    case 'visits':
      row.push(value);
      break;
    case 'domain':
      row.push(dom);
      break;
    case 'search_term':
      row.push(searchTerm);
      break;
    case 'organic_paid':
      row.push(organicOrPaid);
      break;
    default:
      row.push('');
    }
  });

  return row;
}

/**
 * Tries to retrieve the requested data in the cache, and calls the API if not successful
 *
 * @param {string} url - url to the desired API endpoint
 * @param {?object} params - object that contains the URL parameters and their values
 * @return {object} - Results, or null if the API call wasn't successful
 */
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
 * @param {String} url - url to the desired API endpoint
 * @param {object} params - object that contains the URL parameters and their values
 * @return {object} Results returned by the API, or null if the API call wasn't successful
 */
function httpGet(url, params) {
  var urlParams = Object.keys(params).map(function(k) {return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
  var fullUrl = url + (urlParams.length > 0 ? '?' + urlParams : '');

  console.log('Fetching', fullUrl.replace(/api_key=[0-9a-f]{26}/gi, 'api_key=xxxxxxxxxxx'));
  var response = UrlFetchApp.fetch(fullUrl, { 'muteHttpExceptions': true });
  console.log('Response', response);

  var data = JSON.parse(response);

  return data;
}
