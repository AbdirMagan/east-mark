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
        // The name of the business is not a word to be translated: a seller who
        // hears "East-Market" on the radio has to find that name in the app,
        // whichever language they read it in.
        for (language in AppLanguage.values()) {
            assertEquals("East-Market", LocalizationManager.getString("app_name", language))
        }

        // Conditions, unlike the brand, are ordinary words and do stand alone --
        // the English used to trail them in brackets, which read as a hedge
        // about whether the translation could be trusted.
        assertEquals("New", LocalizationManager.getConditionString(ProductCondition.NEW, AppLanguage.ENGLISH))
        assertEquals("Cusub", LocalizationManager.getConditionString(ProductCondition.NEW, AppLanguage.SOMALI))
        assertEquals("አዲስ", LocalizationManager.getConditionString(ProductCondition.NEW, AppLanguage.AMHARIC))
        assertEquals("Mpya", LocalizationManager.getConditionString(ProductCondition.NEW, AppLanguage.SWAHILI))
    }

    @Test
    fun categoriesAndCountries_haveCorrectDefinitions() {
        // The top level mirrors the category roots the backend serves. Asserting
        // the ids rather than a count says which ones, and a count alone passes
        // just as happily when one is swapped for another.
        assertEquals(
            listOf("electronics", "houses", "cars", "land", "livestock", "home-office-goods"),
            DatabaseInitializer.CATEGORIES.map { it.id },
        )
        assertEquals(
            listOf("somaliland", "somalia", "ethiopia", "kenya", "djibouti"),
            DatabaseInitializer.COUNTRIES.map { it.id },
        )

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
