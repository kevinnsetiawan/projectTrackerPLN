import assert from 'node:assert/strict';
import {
  agendaHour, dateKey, parseCalendarDate, shiftCalendarDate, startOfWeek,
} from './src/components/agendaCalendarUtils.js';

assert.equal(dateKey(startOfWeek('2024-06-26')), '2024-06-24');
assert.equal(dateKey(shiftCalendarDate('2024-01-31', -1, 'month')), '2023-12-01');
assert.equal(dateKey(shiftCalendarDate(new Date(2024, 11, 31), 1, 'month')), '2025-01-01');
assert.equal(dateKey(parseCalendarDate(new Date(2024, 5, 25))), '2024-06-25');
assert.equal(agendaHour({ jam_rapat: '08:30' }), 8);
assert.equal(agendaHour({ jam_rapat: '08:30' }), agendaHour({ jam_rapat: '08:00' }));
assert.equal(agendaHour({ jam_rapat: '' }), null);
assert.equal(agendaHour({ jam_rapat: null }), null);

console.log('Agenda calendar tests passed.');
