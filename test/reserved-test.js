'use strict';

const assert = require('bsert');
const fs = require('bfile');
const reserved = require('../lib/covenants/reserved');
const rules = require('../lib/covenants/rules');

describe('Reserved', function() {
  it('should get a domain', () => {
    const desc = reserved.getByName('twitter');

    assert.deepStrictEqual(desc, {
      name: 'twitter',
      hash: Buffer.from(
        '525ce500322a0f4c91070eb73829b9d96b2e70d964905fa88c8b20ea573029ea',
        'hex'),
      target: 'twitter.com.',
      value: 566471548,
      root: false
    });
  });

  it('should get a reserved TLD', () => {
    const desc = reserved.getByName('google');

    assert.deepStrictEqual(desc, {
      name: 'google',
      hash: Buffer.from(
        '6292be73bdfdc4ea12bdf3018c8c553d3022b37601bb2b19153c8804bdf8da15',
        'hex'),
      target: 'google.',
      value: 34053011272,
      root: true
    });
  });

  it('should get a reserved custom name', () => {
    const desc = reserved.getByName('eth');

    assert.deepStrictEqual(desc, {
      name: 'eth',
      hash: Buffer.from(
        '4b3cdfda85c576e43c848d43fdf8e901d8d02553fec8ee56289d10b8dc47d997',
        'hex'),
      target: 'eth.ens.domains.',
      value: 10200566471548,
      root: false
    });
  });

  it('should get all names', async () => {
    const map = await fs.readJSON(`${__dirname}/../lib/covenants/names.json`);
    const zeroHash = Buffer.alloc(32, 0x00).toString('hex');
    const [, nameValue, rootValue] = map[zeroHash];
    const names = [];

    let total = 0;

    for (const hash of Object.keys(map)) {
      const item = map[hash];

      if (hash === zeroHash)
        continue;

      const [name, flags] = item;
      const root = (flags & 1) !== 0;
      const zero = (flags & 2) !== 0;
      const custom = (flags & 4) !== 0;

      let value = root ? rootValue : nameValue;

      if (custom)
        value += item[2];

      if (zero)
        value = 0;

      names.push({
        name: name.split('.')[0],
        hash: Buffer.from(hash, 'hex'),
        target: name,
        value,
        root
      });

      total += value;
    }

    for (const item of names) {
      assert.deepStrictEqual(reserved.get(item.hash), item);
      assert(reserved.has(item.hash));

      assert.deepStrictEqual(reserved.getByName(item.name), item);
      assert(reserved.hasByName(item.name));
    }

    assert.strictEqual(total, 203999999937640 - (10200000 * 1e6));
  });

  it('should always reserve a root TLD', async () => {
    const network = {
      names: {
        noReserved: false,
        claimPeriod: 10
      }
    };

    // Reserved names are only reserved for a limited time
    assert(rules.isReserved(
      rules.hashString('facebook'),
      5,
      network));

    assert(!rules.isReserved(
      rules.hashString('facebook'),
      50,
      network));

    // Root names (gTLDs) are always reserved
    assert(rules.isReserved(
      rules.hashString('com'),
      5,
      network));

    assert(rules.isReserved(
      rules.hashString('com'),
      50,
      network));
  });
});
