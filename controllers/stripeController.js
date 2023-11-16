import stripePackage from 'stripe';
import dotenv from "dotenv";
import { errorHandler } from "../utils/error.js";
import { Users } from '../models/usersModel.js';
dotenv.config();

const stripe = stripePackage(process.env.STRIPE_KEY);
const YOUR_DOMAIN = process.env.YOUR_DOMAIN;
export const checkout = async (req, res, next) => {
  let userId = req.body.userId;

  console.log(userId);
  const FindUser = await Users.findById(userId);
  console.log(FindUser);
  if (!FindUser) return next(errorHandler(404, 'User not found!'));  
  const customerId = FindUser.stripeCusId;
  
  const prices = await stripe.prices.list({
    lookup_keys: [req.body.lookup_key],
    expand: ['data.product'],
  });

  console.log(prices);
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    billing_address_collection: 'auto',
    line_items: [
      {
        price: prices.data[0].id,
        // For metered billing, do not pass quantity
        quantity: 1,

      },
    ],
    mode: 'subscription',
    success_url: `${YOUR_DOMAIN}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${YOUR_DOMAIN}/cancel.html`,
  });
  console.log(session.id);
  res.redirect(303, session.url);
};

export const createSession = async (req, res) => {
  // For demonstration purposes, we're using the Checkout session to retrieve the customer ID.
  // Typically this is stored alongside the authenticated user in your database.
  const { session_id } = req.body;
  const checkoutSession = await stripe.checkout.sessions.retrieve(session_id);
  // This is the url to which the customer will be redirected when they are done
  // managing their billing with the portal.
  const returnUrl = YOUR_DOMAIN;


  const portalSession = await stripe.billingPortal.sessions.create({
    customer: checkoutSession.customer,
    return_url: returnUrl,
  });

  res.redirect(303, portalSession.url);
};



export const stripeWebhook = (request, response) => {
  // This is your Stripe CLI webhook secret for testing your endpoint locally.
  const endpointSecret = "whsec_g8xr7Yeu5kNwO1cm7yERoeEw32IbiPGV";
  const sig = request.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
  } catch (err) {
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.async_payment_failed':
      const checkoutSessionAsyncPaymentFailed = event.data.object;
      console.log("checkoutSessionAsyncPaymentFailed");
      // Then define and call a function to handle the event checkout.session.async_payment_failed
      break;
    case 'checkout.session.async_payment_succeeded':
      const checkoutSessionAsyncPaymentSucceeded = event.data.object;
      console.log("checkoutSessionAsyncPaymentSucceeded");
      // Then define and call a function to handle the event checkout.session.async_payment_succeeded
      break;
    case 'checkout.session.completed':
      const checkoutSessionCompleted = event.data.object;
      console.log("checkoutSessionCompleted");
      // Then define and call a function to handle the event checkout.session.completed
      break;
    case 'checkout.session.expired':
      const checkoutSessionExpired = event.data.object;
      console.log("checkoutSessionExpired");
      // Then define and call a function to handle the event checkout.session.expired
      break;
    case 'subscription_schedule.aborted':
      const subscriptionScheduleAborted = event.data.object;
      console.log("subscriptionScheduleAborted")
      // Then define and call a function to handle the event subscription_schedule.aborted
      break;
    case 'subscription_schedule.canceled':
      const subscriptionScheduleCanceled = event.data.object;
      console.log("subscriptionScheduleCanceled");
      // Then define and call a function to handle the event subscription_schedule.canceled
      break;
    case 'subscription_schedule.completed':
      const subscriptionScheduleCompleted = event.data.object;
      console.log("subscriptionScheduleCompleted");
      // Then define and call a function to handle the event subscription_schedule.completed
      break;
    case 'subscription_schedule.created':
      const subscriptionScheduleCreated = event.data.object;
      console.log("subscriptionScheduleCreated");
      // Then define and call a function to handle the event subscription_schedule.created
      break;
    case 'subscription_schedule.expiring':
      const subscriptionScheduleExpiring = event.data.object;
      console.log("subscriptionScheduleExpiring");
      // Then define and call a function to handle the event subscription_schedule.expiring
      break;
    case 'subscription_schedule.released':
      const subscriptionScheduleReleased = event.data.object;
      console.log("subscriptionScheduleReleased");
      // Then define and call a function to handle the event subscription_schedule.released
      break;
    case 'subscription_schedule.updated':
      const subscriptionScheduleUpdated = event.data.object;
      console.log("subscriptionScheduleUpdated");
      // Then define and call a function to handle the event subscription_schedule.updated
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  response.send();
};

