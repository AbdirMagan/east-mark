package com.example.domain

import com.example.data.model.Currency
import java.text.DecimalFormat

object CurrencyConverter {

    fun convert(amount: Double, fromCurrencyCode: String, toCurrencyCode: String): Double {
        val from = Currency.fromCode(fromCurrencyCode)
        val to = Currency.fromCode(toCurrencyCode)

        if (from == to) return amount

        // First convert to USD
        val inUsd = amount / from.rateToUsd
        // Then convert to target currency
        return inUsd * to.rateToUsd
    }

    fun convert(amount: Double, fromCurrency: Currency, toCurrency: Currency): Double {
        return convert(amount, fromCurrency.code, toCurrency.code)
    }

    fun formatPrice(amount: Double, currency: Currency): String {
        val formatter = if (amount >= 1000) {
            DecimalFormat("#,###")
        } else {
            DecimalFormat("#,##0.##")
        }
        return "${currency.symbol} ${formatter.format(amount)}"
    }

    fun formatConverted(
        originalPrice: Double,
        originalCurrencyCode: String,
        targetCurrency: Currency
    ): String {
        val convertedAmount = convert(originalPrice, originalCurrencyCode, targetCurrency.code)
        val primaryFormatted = formatPrice(convertedAmount, targetCurrency)

        val originalCurrency = Currency.fromCode(originalCurrencyCode)
        return if (originalCurrency != targetCurrency) {
            val originalFormatted = formatPrice(originalPrice, originalCurrency)
            "$primaryFormatted (~$originalFormatted)"
        } else {
            primaryFormatted
        }
    }
}
