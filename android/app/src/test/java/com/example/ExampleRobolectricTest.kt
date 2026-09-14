package com.example

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.example.data.local.DatabaseInitializer
import com.example.data.model.AppLanguage
import com.example.data.model.Currency
import com.example.data.model.ProductCondition
import com.example.domain.CurrencyConverter
import com.example.domain.LocalizationManager
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class ExampleRobolectricTest {

    @Test
    fun readStringFromContext_matchesAppName() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val appName = context.getString(R.string.app_name)
        assertEquals("East-Market", appName)
    }

    @Test
    fun currencyConverter_convertsAccurately() {
        // 100 USD to SLSH (rate 8500)
        val slsh = CurrencyConverter.convert(100.0, Currency.USD, Currency.SLSH)
        assertEquals(850000.0, slsh, 0.001)

        // 100 USD to ETB (rate 125)
        val etb = CurrencyConverter.convert(100.0, Currency.USD, Currency.ETB)
        assertEquals(12500.0, etb, 0.001)

        // 100 USD to KES (rate 130)
        val kes = CurrencyConverter.convert(100.0, Currency.USD, Currency.KES)
        assertEquals(13000.0, kes, 0.001)
    }

    @Test
    fun localizationManager_providesMultiLanguageSupport() {
        assertEquals("East-Market", LocalizationManager.getString("app_name", AppLanguage.ENGLISH))
        assertEquals("Suuqa Bariga Afrika", LocalizationManager.getString("app_name", AppLanguage.SOMALI))
        assertEquals("የምስራቅ ገበያ", LocalizationManager.getString("app_name", AppLanguage.AMHARIC))
        assertEquals("Soko la Afrika Mashariki", LocalizationManager.getString("app_name", AppLanguage.SWAHILI))

        // Check condition translations
        assertEquals("Cusub (New)", LocalizationManager.getConditionString(ProductCondition.NEW, AppLanguage.SOMALI))
        assertEquals("አዲስ (New)", LocalizationManager.getConditionString(ProductCondition.NEW, AppLanguage.AMHARIC))
        assertEquals("Mpya (New)", LocalizationManager.getConditionString(ProductCondition.NEW, AppLanguage.SWAHILI))
    }

    @Test
    fun categoriesAndCountries_haveCorrectDefinitions() {
        assertEquals(25, DatabaseInitializer.CATEGORIES.size)
        assertEquals(4, DatabaseInitializer.COUNTRIES.size)

        val somaliland = DatabaseInitializer.COUNTRIES.first { it.id == "somaliland" }
        assertTrue(somaliland.cities.contains("Hargeisa"))
        assertTrue(somaliland.cities.contains("Berbera"))

        val somalia = DatabaseInitializer.COUNTRIES.first { it.id == "somalia" }
        assertTrue(somalia.cities.contains("Mogadishu"))

        val ethiopia = DatabaseInitializer.COUNTRIES.first { it.id == "ethiopia" }
        assertTrue(ethiopia.cities.contains("Addis Ababa"))

        val kenya = DatabaseInitializer.COUNTRIES.first { it.id == "kenya" }
        assertTrue(kenya.cities.contains("Nairobi"))
    }
}
