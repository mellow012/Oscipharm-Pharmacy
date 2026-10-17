import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeGroupName,
  buildStockImportPreview,
} from './stock-import.ts';

test('normalizeGroupName reduces noisy group text to one canonical key', () => {
  assert.equal(normalizeGroupName('  PANADOL 500mg   '), 'panadol 500mg');
  assert.equal(normalizeGroupName('Panadol\t500 mg'), 'panadol 500 mg');
  assert.equal(normalizeGroupName('Amoxicillin 250mg / Capsules'), 'amoxicillin 250mg capsules');
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
