import uuid
from typing import Optional, Dict, Any


class PaymentProvider:
    name = "base"

    def create_payment(self, amount: float, currency: str, metadata: Optional[Dict[str, Any]] = None):
        raise NotImplementedError

    def verify_payment(self, payment_id: str, success: bool = True):
        raise NotImplementedError

    def handle_webhook(self, payload: Dict[str, Any]):
        raise NotImplementedError


class MockPaymentProvider(PaymentProvider):
    """Development provider. Never stores card numbers or bank credentials."""
    name = "mock"

    def create_payment(self, amount: float, currency: str, metadata: Optional[Dict[str, Any]] = None):
        payment_id = f"mock_{uuid.uuid4()}"
        return {
            "provider": self.name,
            "payment_id": payment_id,
            "status": "pending",
            "amount": amount,
            "currency": currency,
            "metadata": metadata or {},
        }

    def verify_payment(self, payment_id: str, success: bool = True):
        if not payment_id:
            return {"provider": self.name, "payment_id": payment_id, "status": "failed"}
        return {
            "provider": self.name,
            "payment_id": payment_id,
            "status": "successful" if success else "failed",
        }

    def handle_webhook(self, payload: Dict[str, Any]):
        payment_id = payload.get("payment_id") or payload.get("transaction_reference")
        success = payload.get("success", payload.get("status") != "failed")
        return self.verify_payment(payment_id, success=bool(success))


class PaymentService:
    def __init__(self, provider: Optional[PaymentProvider] = None):
        self.provider = provider or MockPaymentProvider()

    def create_payment(self, amount: float, currency: str = "INR", metadata: Optional[Dict[str, Any]] = None):
        return self.provider.create_payment(amount, currency, metadata)

    def verify_payment(self, payment_id: str, success: bool = True):
        return self.provider.verify_payment(payment_id, success)

    def handle_webhook(self, payload: Dict[str, Any]):
        return self.provider.handle_webhook(payload)


payment_service = PaymentService()
