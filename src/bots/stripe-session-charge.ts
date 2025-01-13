import { BotEvent, MedplumClient } from '@medplum/core';
import { Appointment, Invoice } from '@medplum/fhirtypes';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const SESSION_FEE = 15000; // $150.00 in cents

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
  const appointment = event.input as Appointment;
  
  if (appointment.status !== 'fulfilled') {
    return { success: false, message: 'Appointment not fulfilled' };
  }

  try {
    // Get patient's payment method from Medplum
    const paymentMethods = await medplum.searchResources('PaymentMethod', {
      subject: appointment.subject?.reference,
      status: 'active'
    });

    if (!paymentMethods.length) {
      return { success: false, message: 'No active payment method found' };
    }

    const stripePaymentMethodId = paymentMethods[0].identifier?.find(
      id => id.system === 'https://stripe.com'
    )?.value;

    if (!stripePaymentMethodId) {
      return { success: false, message: 'No Stripe payment method found' };
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: SESSION_FEE,
      currency: 'usd',
      payment_method: stripePaymentMethodId,
      confirm: true,
      off_session: true,
      description: `Therapy Session ${new Date(appointment.start || '').toLocaleDateString()}`
    });

    // Create ChargeItem in Medplum
    const chargeItem = await medplum.createResource({
      resourceType: 'ChargeItem',
      status: 'billable',
      code: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/data-absent-reason',
          code: 'therapy-session',
          display: 'Therapy Session'
        }]
      },
      subject: appointment.subject,
      occurrence: appointment.start,
      performer: appointment.participant?.map(p => ({ actor: p.actor })),
      quantity: { value: 1 },
      priceOverride: {
        value: SESSION_FEE / 100,
        currency: 'USD'
      },
      identifier: [{
        system: 'https://stripe.com/payment_intent',
        value: paymentIntent.id
      }]
    });

    // Create Invoice in Medplum
    const invoice = await medplum.createResource<Invoice>({
      resourceType: 'Invoice',
      status: 'issued',
      type: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/invoice-type',
          code: 'professional',
          display: 'Professional Charge'
        }]
      },
      subject: appointment.subject,
      date: new Date().toISOString(),
      lineItem: [{
        chargeItemReference: { reference: `ChargeItem/${chargeItem.id}` },
        priceComponent: [{
          type: 'base',
          amount: {
            value: SESSION_FEE / 100,
            currency: 'USD'
          }
        }]
      }],
      totalGross: {
        value: SESSION_FEE / 100,
        currency: 'USD'
      },
      totalNet: {
        value: SESSION_FEE / 100,
        currency: 'USD'
      },
      identifier: [{
        system: 'https://stripe.com/payment_intent',
        value: paymentIntent.id
      }]
    });

    // Send receipt email using Stripe
    await stripe.invoices.sendEmail(paymentIntent.id);

    return { 
      success: true, 
      paymentIntentId: paymentIntent.id,
      invoiceId: invoice.id
    };
  } catch (error) {
    console.error('Payment processing error:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Payment processing failed'
    };
  }
}