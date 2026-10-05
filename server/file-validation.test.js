import test from 'node:test';
import assert from 'node:assert/strict';
import { hasValidImageSignature } from './file-validation.js';

test('accepts JPEG magic bytes', () => {
  assert.equal(hasValidImageSignature(Buffer.from([0xff,0xd8,0xff,0xdb,0,0,0,0,0,0,0,0]), 'image/jpeg'), true);
});

test('rejects spoofed JPEG', () => {
  assert.equal(hasValidImageSignature(Buffer.from('this is html!'), 'image/jpeg'), false);
});

test('accepts PNG signature', () => {
  assert.equal(hasValidImageSignature(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0]), 'image/png'), true);
});
