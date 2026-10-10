const Razorpay = require("razorpay");
const CATALOG = require("./catalog");
function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(body));
}
module.exports = async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return json(res, 503, { error: "Secure checkout is not configured yet. Please try again later." });
  try {
    const { offerId, choice, customer } = req.body || {};
    const offer = CATALOG[offerId];
    if (!offer) return json(res, 400, { error: "This offer cannot be booked online." });
    if (!["full", "half", "reserve"].includes(choice)) return json(res, 400, { error: "Choose full payment, 50% payment or ₹999 booking." });
    const amountRupees = choice === "full" ? offer.price : choice === "half" ? offer.price / 2 : 999;
    const amountPaise = Math.round(amountRupees * 100);
    const name = String(customer?.name || "").trim().slice(0, 120);
    const email = String(customer?.email || "").trim().slice(0, 254);
    const phone = String(customer?.phone || "").trim().slice(0, 32);
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.length < 7)
      return json(res, 400, { error: "Please provide a valid name, email and phone number." });
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await razorpay.orders.create({
      amount: amountPaise, currency: "INR",
      receipt: `ofr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`.slice(0, 40),
      notes: { source: "ORIGENNT October Offers", offer_id: offerId, offer_name: offer.name,
        payment_choice: choice, amount_rupees: String(amountRupees), mrp_reference: String(offer.mrp),
        customer_name: name, customer_email: email, customer_phone: phone }
    });
    return json(res, 200, { keyId, orderId: order.id, amount: order.amount, currency: order.currency, choice });
  } catch (error) {
    console.error("Razorpay order creation failed", error?.message || error);
    return json(res, 502, { error: "Unable to create a payment order. Please retry." });
  }
};
