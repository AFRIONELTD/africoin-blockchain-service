#!/usr/bin/env node
// Quick test to confirm live TRX/USD price fetch from Binance

let _trxUsdCache = { price: null, fetchedAt: 0 };

async function getTrxUsdPrice() {
  const now = Date.now();
  if (_trxUsdCache.price && now - _trxUsdCache.fetchedAt < 60_000) {
    return _trxUsdCache.price;
  }
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=TRXUSDT');
    if (!res.ok) throw new Error(`Binance API returned ${res.status}`);
    const data = await res.json();
    const price = Number(data.price);
    if (!price || price <= 0) throw new Error('Invalid price from Binance');
    _trxUsdCache = { price, fetchedAt: now };
    return price;
  } catch (err) {
    const fallback = Number(process.env.TRX_USD_PRICE || '0.10');
    console.warn(`⚠️ TRX price fetch failed (${err.message}), using fallback: $${fallback}`);
    return fallback;
  }
}

async function main() {
  console.log('Fetching TRX/USD price from Binance...');
  const price1 = await getTrxUsdPrice();
  console.log(`✅ Live price:   $${price1}`);

  console.log('Fetching again (should hit cache)...');
  const price2 = await getTrxUsdPrice();
  console.log(`✅ Cached price: $${price2}`);
  console.log(price1 === price2 ? '✅ Cache working correctly' : '❌ Cache not working');
}

main().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
