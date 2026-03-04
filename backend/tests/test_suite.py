"""
Automated Test Suite for CtrlZ-The-ADCB Backend.
Tests: Currency API, Route validation, Service functions.

Run with: python -m pytest tests/ -v
"""

import pytest
import asyncio
from decimal import Decimal

# ══════════════════════════════════════════
# Test 1: Currency Service (Unit Tests)
# ══════════════════════════════════════════


class TestCurrencyService:
    """Test the currency_service module functions."""

    def test_same_currency_returns_1(self):
        """Same currency should always return 1.0"""
        from app.currency_service import fetch_exchange_rate

        rate = asyncio.get_event_loop().run_until_complete(
            fetch_exchange_rate("MYR", "MYR")
        )
        assert rate == Decimal("1.0")

    def test_usd_to_usd_returns_1(self):
        from app.currency_service import fetch_exchange_rate

        rate = asyncio.get_event_loop().run_until_complete(
            fetch_exchange_rate("USD", "USD")
        )
        assert rate == Decimal("1.0")

    def test_convert_to_base(self):
        """convert_to_base should multiply amount * exchange_rate."""
        from app.currency_service import convert_to_base

        result = convert_to_base(
            Decimal("100"),
            "USD",
            "MYR",
            Decimal("4.75"),
        )
        assert result == Decimal("475.00")

    def test_fallback_rates_exist(self):
        """Verify all SEA currencies exist in fallback."""
        from app.currency_service import _FALLBACK_RATES

        required = ["USD", "EUR", "MYR", "SGD", "IDR", "PHP", "THB", "VND", "AED"]
        for code in required:
            assert code in _FALLBACK_RATES, f"Missing fallback for {code}"

    def test_cross_rate_calculation(self):
        """Test the cross-rate logic: SGD -> MYR should produce a reasonable rate."""
        from app.currency_service import fetch_exchange_rate

        rate = asyncio.get_event_loop().run_until_complete(
            fetch_exchange_rate("SGD", "MYR")
        )
        # SGD ~1.34 USD, MYR ~4.75 USD => 1 SGD ≈ 3.5 MYR (roughly)
        assert rate > Decimal("0.1"), f"Rate too low: {rate}"
        assert rate < Decimal("100"), f"Rate too high: {rate}"


# ══════════════════════════════════════════
# Test 2: Currency Route (Integration Tests)
# ══════════════════════════════════════════


class TestCurrencyRoute:
    """Test the /api/currency/rate endpoint."""

    def setup_method(self):
        from fastapi.testclient import TestClient
        from app.main import app

        self.client = TestClient(app)

    def test_rate_endpoint_valid_params(self):
        """GET /api/currency/rate?from=USD&to=MYR should return a rate."""
        resp = self.client.get("/api/currency/rate?from=USD&to=MYR")
        assert resp.status_code == 200
        data = resp.json()
        assert "rate" in data
        assert data["rate"] > 0
        assert data["from"] == "USD"
        assert data["to"] == "MYR"

    def test_rate_endpoint_same_currency(self):
        """Same currency should return rate = 1.0"""
        resp = self.client.get("/api/currency/rate?from=MYR&to=MYR")
        assert resp.status_code == 200
        assert resp.json()["rate"] == 1.0

    def test_rate_endpoint_old_params(self):
        """Backwards-compatible params: ?from_currency=SGD&base_currency=MYR"""
        resp = self.client.get(
            "/api/currency/rate?from_currency=SGD&base_currency=MYR"
        )
        assert resp.status_code == 200
        assert resp.json()["rate"] > 0

    def test_rate_endpoint_no_params_defaults(self):
        """No params should default to USD -> MYR"""
        resp = self.client.get("/api/currency/rate")
        assert resp.status_code == 200
        data = resp.json()
        assert data["from"] == "USD"
        assert data["to"] == "MYR"

    def test_rate_endpoint_sea_currencies(self):
        """Test various SEA currency pairs."""
        pairs = [
            ("SGD", "MYR"),
            ("IDR", "MYR"),
            ("PHP", "MYR"),
            ("THB", "MYR"),
            ("VND", "MYR"),
            ("USD", "SGD"),
        ]
        for src, dst in pairs:
            resp = self.client.get(f"/api/currency/rate?from={src}&to={dst}")
            assert resp.status_code == 200, f"Failed for {src}->{dst}"
            assert resp.json()["rate"] > 0, f"Invalid rate for {src}->{dst}"


# ══════════════════════════════════════════
# Test 3: Model Validation
# ══════════════════════════════════════════


class TestModels:
    """Test that Pydantic models validate correctly."""

    def test_invoice_create_defaults_to_myr(self):
        from app.models import InvoiceCreate

        inv = InvoiceCreate(
            client_id="test-id",
            invoice_number="INV-001",
            date="2026-01-01",
            month="2026-01",
            items=[{"description": "Widget", "price": 100, "quantity": 2}],
        )
        assert inv.currency == "MYR"
        assert inv.exchange_rate == Decimal("1.0")

    def test_payment_create_defaults_to_myr(self):
        from app.models import PaymentCreate

        pay = PaymentCreate(
            client_id="test-id",
            amount=500,
            date="2026-01-15",
        )
        assert pay.currency == "MYR"
        assert pay.exchange_rate == Decimal("1.0")

    def test_company_create_defaults_to_myr(self):
        from app.models import CompanyCreate

        company = CompanyCreate(name="Test Corp")
        assert company.base_currency == "MYR"

    def test_financial_summary_defaults_to_myr(self):
        from app.models import FinancialSummaryOut

        summary = FinancialSummaryOut(
            cash_on_hand=1000,
            total_assets=2000,
            available_for_expenses=500,
            client_pending=[],
            supplier_pending=[],
        )
        assert summary.base_currency == "MYR"


# ══════════════════════════════════════════
# Test 4: Health Check
# ══════════════════════════════════════════


class TestHealthCheck:
    """Test basic app routes."""

    def setup_method(self):
        from fastapi.testclient import TestClient
        from app.main import app

        self.client = TestClient(app)

    def test_health_endpoint(self):
        resp = self.client.get("/")
        assert resp.status_code == 200
        assert "running" in resp.json()["message"].lower()

    def test_protected_requires_auth(self):
        """Protected route should return 401 without a token."""
        resp = self.client.get("/api/protected")
        assert resp.status_code in (401, 403)
