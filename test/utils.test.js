var dateToYearMonth = require('../src/utils.js')['dateToYearMonth'];
var buildUrl = require('../src/utils.js')['buildUrl'];
var cleanDomain = require('../src/utils.js')['cleanDomain'];

test('Date to YYYY-MM', () => {
  var date = '2018-01-03';
  expect(dateToYearMonth(date)).toBe('2018-01');
});

test('Built URL contains all parameters', () => {
  var url = 'https://api.similarweb.com';
  var params = {
    api_key: 'xxxx',
    start_date: '2018-01',
    end_date: '2018-12'
  };

  var fullUrl = buildUrl(url, params);

  expect(fullUrl).toEqual(expect.stringMatching(new RegExp('^' + url + '.*')));
  Object.keys(params).forEach(function(key) {
    var reParam = new RegExp('[?&]' + key + '=' + params[key] + '(?:&.+)?$');
    console.log(reParam);
    expect(fullUrl).toEqual(expect.stringMatching(reParam));
  });
});

test('Build URL without parameters', () => {
  var url = 'https://api.similarweb.com';

  var fullUrl = buildUrl(url);
  expect(fullUrl).toBe(url);
});

test('Clean Domain', () => {
  var domain = 'https://www.similarweb.com/test';

  expect(cleanDomain(domain)).toBe('similarweb.com');
});
