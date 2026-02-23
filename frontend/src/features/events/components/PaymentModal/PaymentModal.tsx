import React, { useState } from 'react';
import { Button } from '../../../../components/common/Button';
import { Modal } from '../../../../components/common/Modal';
import api from '../../../../lib/api';
import type { EventDetail } from '../../../../types/events';
import styles from './PaymentModal.module.css';

interface PaymentModalProps {
  event: EventDetail;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  event,
  isOpen,
  onClose,
  onSuccess: _onSuccess,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  const handleCheckout = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await api.post('/payments/create-checkout-session', {
        event_id: event.id,
        payment_method: 'stripe',
        success_url: `${window.location.origin}/events/${event.id}?payment=success`,
        cancel_url: `${window.location.origin}/events/${event.id}?payment=cancelled`,
      });

      // Redirect to Stripe Checkout
      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err: any) {
      console.error('Payment failed:', err);
      setError(err.response?.data?.detail || 'Payment failed. Please try again.');
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Registration">
      <div className={styles.content}>
        <div className={styles.eventInfo}>
          <h3>{event.name}</h3>
          <p className={styles.eventDate}>
            {new Date(event.start_datetime).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <div className={styles.priceSection}>
          <span className={styles.priceLabel}>Registration Fee</span>
          <span className={styles.priceValue}>
            {formatPrice(event.price_cents, event.currency)}
          </span>
        </div>

        <div className={styles.divider} />

        <div className={styles.paymentInfo}>
          <div className={styles.securePayment}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a2 2 0 00-2 2v1H4a2 2 0 00-2 2v7a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2h-2V3a2 2 0 00-2-2zm0 1a1 1 0 011 1v1H7V3a1 1 0 011-1z" />
            </svg>
            <span>Secure payment powered by Stripe</span>
          </div>
          <p className={styles.redirectInfo}>
            You will be redirected to Stripe to complete your payment securely.
            After payment, you'll be returned to this page.
          </p>
        </div>

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleCheckout} isLoading={isProcessing}>
            {isProcessing ? 'Processing...' : 'Proceed to Payment'}
          </Button>
        </div>

        <p className={styles.terms}>
          By proceeding, you agree to our terms of service and refund policy.
        </p>
      </div>
    </Modal>
  );
};

export default PaymentModal;
