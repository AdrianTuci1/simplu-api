require('dotenv/config');

/*
 Usage:
  node scripts/test-stripe.js inspect --product $STRIPE_BASIC_PRODUCT_ID --currency ron
  node scripts/test-stripe.js subscribe --customer cus_xxx --price price_xxx
  node scripts/test-stripe.js subscribe --customer cus_xxx --product prod_xxx --interval month --currency ron
  node scripts/test-stripe.js cancel --subscription sub_xxx
*/

const Stripe = require('stripe');

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Missing STRIPE_SECRET_KEY');
  const stripe = new Stripe(key, { apiVersion: '2024-04-10' });

  const arg = (name, def) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : def;
  };

  if (cmd === 'inspect') {
    const product = arg('product');
    const currency = (arg('currency', 'ron') || 'ron').toLowerCase();
    if (!product) throw new Error('--product required');
    const prices = await stripe.prices.list({ product, active: true, limit: 100 });
    const mapped = prices.data.map(p => ({ id: p.id, currency: p.currency, interval: p.recurring?.interval, amount: p.unit_amount }));
    const byCurrency = mapped.filter(p => p.currency === currency);
    console.log('All prices:', mapped);
    console.log(`Prices for currency=${currency}:`, byCurrency);
    const month = byCurrency.find(p => p.interval === 'month');
    const year = byCurrency.find(p => p.interval === 'year');
    console.log('Resolved month:', month || null);
    console.log('Resolved year:', year || null);
    return;
  }

  if (cmd === 'subscribe') {
    const customer = arg('customer');
    const price = arg('price');
    const product = arg('product');
    const interval = arg('interval');
    const currency = (arg('currency', 'ron') || 'ron').toLowerCase();
    if (!customer) throw new Error('--customer required');
    let priceId = price;
    if (!priceId) {
      if (!product || !interval) throw new Error('Provide either --price or (--product and --interval)');
      const prices = await stripe.prices.list({ product, active: true, limit: 100 });
      const match = prices.data.find(p => p.recurring?.interval === interval && p.currency?.toLowerCase() === currency) || prices.data.find(p => p.recurring?.interval === interval);
      if (!match) throw new Error('No matching price found');
      priceId = match.id;
      console.log('Resolved priceId:', priceId);
    }
    const sub = await stripe.subscriptions.create({
      customer,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });
    console.log('Subscription:', { id: sub.id, status: sub.status, priceId });
    const pi = sub.latest_invoice?.payment_intent;
    if (pi) console.log('PaymentIntent:', { id: pi.id, status: pi.status, client_secret: pi.client_secret });
    return;
  }

  if (cmd === 'cancel') {
    const subscription = arg('subscription');
    if (!subscription) throw new Error('--subscription required');
    const res = await stripe.subscriptions.cancel(subscription);
    console.log('Canceled:', { id: res.id, status: res.status });
    return;
  }

  console.log('Unknown command');
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

