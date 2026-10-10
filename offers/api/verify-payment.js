const crypto = require("crypto");
const Razorpay = require("razorpay");
const CATALOG = require("./catalog");
function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(body));
}
module.exports = async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return json(res, 503, { error: "Payment verification is not configured." });
  try {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature, offerId, choice } = req.body || {};
    if (!orderId || !paymentId || !signature || !offerId || !["full", "half", "reserve"].includes(choice))
      return json(res, 400, { verified: false, error: "Required payment verification details are missing." });
    const expected = crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
    const actualBuf = Buffer.from(String(signature));
    const expectedBuf = Buffer.from(expected);
    if (actualBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(actualBuf, expectedBuf))
      return json(res, 400, { verified: false, error: "Payment signature verification failed." });
    const offer = CATALOG[offerId];
    if (!offer) return json(res, 400, { verified: false, error: "Unknown offer." });
    const amountRupees = choice === "full" ? offer.price : choice === "half" ? offer.price / 2 : 999;
    const expectedAmount = Math.round(amountRupees * 100);
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const [order, payment] = await Promise.all([razorpay.orders.fetch(orderId), razorpay.payments.fetch(paymentId)]);
    if (order.id !== orderId || order.currency !== "INR" || order.amount !== expectedAmount ||
        order.notes?.offer_id !== offerId || order.notes?.payment_choice !== choice ||
        payment.order_id !== orderId || payment.amount !== expectedAmount ||
        payment.currency !== "INR" || payment.status !== "captured")
      return json(res, 400, { verified: false, error: "The payment details do not match this booking." });
    return json(res, 200, { verified: true, paymentId, orderId, status: payment.status, amount: payment.amount, currency: payment.currency });
  } catch (error) {
    console.error("Razorpay verification failed", error?.message || error);
    return json(res, 502, { verified: false, error: "Unable to verify this payment right now. Keep your payment ID and contact ORIGENNT." });
  }
};
