import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeGroupName,
  buildStockImportPreview,
} from './stock-import.ts';
import {
  stockCorrectionDelta,
  stockQuantityMatches,
  validateStockCorrectionInput,
} from './stock-adjustment.ts';

test('normalizeGroupName reduces noisy group text to one canonical key', () => {
  assert.equal(normalizeGroupName('  PANADOL 500mg   '), 'panadol 500mg');
  assert.equal(normalizeGroupName('Panadol\t500 mg'), 'panadol 500 mg');
  assert.equal(normalizeGroupName('Amoxicillin 250mg / Capsules'), 'amoxicillin 250mg capsules');
  assert.equal(normalizeGroupName('2026/11/17'), '2026 11 17');
  assert.equal(normalizeGroupName('!!!'), '');

  const legacyPattern = new RegExp(String.raw`[\/&]+`, 'g');
  const currentPattern = /[/&]+/g;
  for (const input of ['2026/11/17', 'Pain/Relief & Wellness', 'back\\slash', 'plain text', '!!!']) {
    assert.equal(input.replace(currentPattern, ' '), input.replace(legacyPattern, ' '));
  }
});

test('buildStockImportPreview skips blank rows and keeps valid rows in preview', () => {
  const preview = buildStockImportPreview([
    {
      rowNumber: 2,
      productGroup: 'Panadol',
      strength: '500mg',
      quantityPacks: '12',
      unitPriceInclTax: '144.00',
      expiryDate: '2025-03-10',
      isTaxInclusive: true,
    },
    {
      rowNumber: 3,
      productGroup: '',
      strength: '',
      quantityPacks: '',
      unitPriceInclTax: '',
      expiryDate: '',
      isTaxInclusive: true,
    },
    {
      rowNumber: 4,
      productGroup: 'Panadol',
      strength: '500mg',
      quantityPacks: '9',
      unitPriceInclTax: '90.00',
      expiryDate: '2100-01-01',
      isTaxInclusive: true,
    },
  ]);

  assert.equal(preview.validRows.length, 2);
  assert.equal(preview.skippedRows.length, 1);
  assert.equal(preview.skippedRows[0].reason, 'empty row');
  assert.equal(preview.validRows[0].normalizedGroup, 'panadol 500mg');
  assert.equal(preview.validRows[1].expiryDate, '2100-01-01');
  assert.equal(preview.validRows[1].expiryDateKnown, false);
  assert.equal(preview.validRows[0].unitPrice.value, 144);
  assert.equal(preview.validRows[0].unitPrice.currency, 'MWK');
});

test('stock correction validates integer counts and a required reason', () => {
  assert.deepEqual(validateStockCorrectionInput({ expectedUnits: '12', countedUnits: '0', reason: 'Shelf count' }), {
    ok: true,
    value: { expectedUnits: 12, countedUnits: 0, reason: 'Shelf count' },
  });
  assert.equal(validateStockCorrectionInput({ expectedUnits: '12', countedUnits: '-1', reason: 'Count' }).ok, false);
  assert.equal(validateStockCorrectionInput({ expectedUnits: '12', countedUnits: '1.5', reason: 'Count' }).ok, false);
  assert.equal(validateStockCorrectionInput({ expectedUnits: '12', countedUnits: '1', reason: '  ' }).ok, false);
  assert.equal(validateStockCorrectionInput({ expectedUnits: '12', countedUnits: '1', reason: 'x'.repeat(201) }).ok, false);
});

test('stock correction delta is signed and stale quantities fail the optimistic guard', () => {
  assert.equal(stockCorrectionDelta(12, 8), -4);
  assert.equal(stockCorrectionDelta(8, 12), 4);
  assert.equal(stockQuantityMatches(12, 12), true);
  assert.equal(stockQuantityMatches(13, 12), false);
});
