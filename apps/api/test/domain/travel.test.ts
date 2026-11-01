import { describe, expect, it } from 'vitest';
import { haversineKm, travelMinutes } from '../../src/domain/travel.js';

describe('travel calculations', () => {
  it('calculates the distance between two north-south points', () => {
    const distance = haversineKm({ lat: 35.65, lng: 128.73 }, { lat: 35.7, lng: 128.73 });

    expect(distance).toBeCloseTo(5.56, 2);
    expect(travelMinutes(distance)).toBe(20);
  });

  it('calculates the distance between two east-west points', () => {
    const distance = haversineKm({ lat: 35.65, lng: 128.73 }, { lat: 35.65, lng: 128.75 });

    expect(distance).toBeCloseTo(1.807, 2);
    expect(travelMinutes(distance)).toBe(10);
  });

  it('rounds a very short nonzero trip up to a five-minute increment', () => {
    const distance = haversineKm({ lat: 35.65, lng: 128.73 }, { lat: 35.651, lng: 128.73 });

    expect(distance).toBeCloseTo(0.111, 2);
    expect(travelMinutes(distance)).toBe(10);
  });

  it('uses zero travel time for zero distance', () => {
    expect(travelMinutes(0)).toBe(0);
  });
});
