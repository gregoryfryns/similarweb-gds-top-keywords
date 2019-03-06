var dateToYearMonth = require('../src/utils.js')['dateToYearMonth'];

test('Date to YYYY-MM', () => {
  var date = '2018-01-03';
  expect(dateToYearMonth(date)).toBe('2018-01');
});
