/* global DataStudioApp, Session, PropertiesService */

if (typeof(require) !== 'undefined') {
  var [retrieveOrGet, httpGet, dateToYearMonth] = require('./utils.js')['retrieveOrGet', 'httpGet', 'dateToYearMonth'];
}

// eslint-disable-next-line no-unused-vars
function getAuthType() {
  var cc = DataStudioApp.createCommunityConnector();
  return cc.newAuthTypeResponse()
    .setAuthType(cc.AuthType.KEY)
    .setHelpUrl('https://account.similarweb.com/#/api-management')
    .build();
}

// eslint-disable-next-line no-unused-vars
function resetAuth() {
  var userProperties = PropertiesService.getUserProperties();
  userProperties.deleteProperty('dscc.similarwebapi.key');
}

// eslint-disable-next-line no-unused-vars
function isAuthValid() {
  var userProperties = PropertiesService.getUserProperties();
  var key = userProperties.getProperty('dscc.similarwebapi.key');

  var data = httpGet('https://api.similarweb.com/capabilities', { api_key: key });

  return (data && data.hasOwnProperty('remaining_hits'));
}

// TODO: look for a proper way to implement this function
// eslint-disable-next-line no-unused-vars
function isAdminUser() {
  var adminUsersWhitelist = [
    'gregory.fryns@similarweb.com',
    'gregory.fryns@gmail.com'
  ];
  var email = Session.getEffectiveUser().getEmail();
  return adminUsersWhitelist.indexOf(email) > -1;
}

/**
 * Checks if the submitted key is valid
 * @param {Request} key The Similarweb API key to be checked
 * @return {boolean} True if the key is valid, false otherwise
 */
function checkForValidKey(key) {
  // Check key format
  if (!key.match(/[0-9a-f]{32}/i)) {
    return false;
  }

  // Check if key is valid
  var data = httpGet('https://api.similarweb.com/capabilities', { api_key: key });

  return (data && data.hasOwnProperty('remaining_hits'));
}

/**
 * Sets the credentials.
 * @param {Request} request The set credentials request.
 * @return {object} An object with an errorCode.
 */
// eslint-disable-next-line no-unused-vars
function setCredentials(request) {
  var key = request.key.trim().toLowerCase();

  var validKey = checkForValidKey(key);
  if (!validKey) {
    return {
      errorCode: 'INVALID_CREDENTIALS'
    };
  }
  var userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty('dscc.similarwebapi.key', key);

  return {
    errorCode: 'NONE'
  };
}

// eslint-disable-next-line no-unused-vars
function getConfig() {
  var cc = DataStudioApp.createCommunityConnector();
  var config = cc.getConfig();

  config.newInfo()
    .setId('instructions')
    .setText('You can find your SimilarWeb API key or create a new one here (a SimilarWeb Pro account is needed): https://account.similarweb.com/#/api-management');

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
  var aggregations = cc.AggregationType;

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
    .setType(types.NUMBER)
    .setIsReaggregatable(true)
    .setAggregation(aggregations.SUM);

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

  var userProperties = PropertiesService.getUserProperties();
  var apiKey = userProperties.getProperty('dscc.similarwebapi.key');

  var startDate = dateToYearMonth(request.dateRange.startDate);
  var endDate = dateToYearMonth(request.dateRange.endDate);
  var country = request.configParams.country.trim().toLowerCase();
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
