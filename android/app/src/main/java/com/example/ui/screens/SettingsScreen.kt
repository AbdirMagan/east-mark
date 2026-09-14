package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.MonetizationOn
import androidx.compose.material.icons.filled.NetworkCheck
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.Security
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.AppLanguage
import com.example.data.model.Currency
import com.example.domain.LocalizationManager
import com.example.ui.theme.BrandGold
import com.example.ui.theme.BrandNavy
import com.example.ui.theme.BrandTeal
import com.example.ui.viewmodel.MarketplaceViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    viewModel: MarketplaceViewModel,
    onNavigateToFavorites: () -> Unit,
    modifier: Modifier = Modifier
) {
    val language by viewModel.selectedLanguage.collectAsState()
    val currency by viewModel.selectedCurrency.collectAsState()
    val country by viewModel.selectedCountry.collectAsState()
    val city by viewModel.selectedCity.collectAsState()
    val dataSaver by viewModel.isDataSaverEnabled.collectAsState()
    val favorites by viewModel.favoriteProducts.collectAsState()

    var showLanguageDialog by remember { mutableStateOf(false) }
    var showCurrencyDialog by remember { mutableStateOf(false) }
    var showSafetyDialog by remember { mutableStateOf(false) }
    var showProhibitedDialog by remember { mutableStateOf(false) }
    var showAboutDialog by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
    ) {
        // Header
        Surface(color = BrandNavy, shadowElevation = 4.dp) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 20.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(54.dp)
                            .clip(CircleShape)
                            .background(BrandTeal),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "EA",
                            color = Color.White,
                            fontWeight = FontWeight.Black,
                            fontSize = 20.sp
                        )
                    }

                    Spacer(modifier = Modifier.width(14.dp))

                    Column {
                        Text(
                            text = "East Africa Trader",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp
                        )
                        Text(
                            text = "📍 $city, ${country.name}",
                            color = Color.White.copy(alpha = 0.8f),
                            fontSize = 12.sp
                        )
                    }
                }
            }
        }

        Column(modifier = Modifier.padding(16.dp)) {
            // Favorites Quick Access
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onNavigateToFavorites() }
                    .testTag("settings_favorites_btn"),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Filled.Favorite,
                        contentDescription = "Favorites",
                        tint = Color(0xFFEF4444),
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(14.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = LocalizationManager.getString("favorites", language),
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp
                        )
                        Text(
                            text = "${favorites.size} saved listings",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color.Gray)
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Regional & Language Section
            Text(
                text = "REGIONAL & LOCALIZATION",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = BrandNavy,
                letterSpacing = 0.5.sp
            )
            Spacer(modifier = Modifier.height(8.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column {
                    // Language
                    SettingRow(
                        icon = Icons.Filled.Language,
                        title = LocalizationManager.getString("language", language),
                        subtitle = "${language.flag} ${language.nativeName} (${language.displayName})",
                        onClick = { showLanguageDialog = true },
                        testTag = "settings_language_row"
                    )

                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

                    // Currency
                    SettingRow(
                        icon = Icons.Filled.MonetizationOn,
                        title = LocalizationManager.getString("currency", language),
                        subtitle = "${currency.code} (${currency.symbol}) - ${currency.label}",
                        onClick = { showCurrencyDialog = true },
                        testTag = "settings_currency_row"
                    )

                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

                    // Location Info
                    SettingRow(
                        icon = Icons.Filled.Public,
                        title = LocalizationManager.getString("location", language),
                        subtitle = "${country.flag} ${country.name} • $city",
                        onClick = { /* handled on Home screen */ },
                        showArrow = false
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Data Saver / Connectivity Section
            Text(
                text = "NETWORK & DATA",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = BrandNavy,
                letterSpacing = 0.5.sp
            )
            Spacer(modifier = Modifier.height(8.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Filled.NetworkCheck,
                        contentDescription = "Data Saver",
                        tint = BrandTeal,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(14.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = LocalizationManager.getString("data_saver", language),
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp
                        )
                        Text(
                            text = "Optimize images for low-bandwidth 2G/3G mobile networks",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Switch(
                        checked = dataSaver,
                        onCheckedChange = { viewModel.setDataSaver(it) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Trust, Safety & Community Guidelines
            Text(
                text = "COMMUNITY TRUST & SAFETY",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = BrandNavy,
                letterSpacing = 0.5.sp
            )
            Spacer(modifier = Modifier.height(8.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column {
                    SettingRow(
                        icon = Icons.Filled.Security,
                        title = LocalizationManager.getString("safety_tips", language),
                        subtitle = "Safe trading, fraud prevention, public meeting advice",
                        onClick = { showSafetyDialog = true }
                    )

                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

                    SettingRow(
                        icon = Icons.Filled.Info,
                        title = "Prohibited Products Policy",
                        subtitle = "Items forbidden from sale across East-Market",
                        onClick = { showProhibitedDialog = true }
                    )

                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

                    SettingRow(
                        icon = Icons.Filled.Public,
                        title = "About East-Market",
                        subtitle = "Version 1.0.0 • Somaliland, Somalia, Ethiopia, Kenya",
                        onClick = { showAboutDialog = true }
                    )
                }
            }

            Spacer(modifier = Modifier.height(40.dp))
        }
    }

    // Language Dialog
    if (showLanguageDialog) {
        AlertDialog(
            onDismissRequest = { showLanguageDialog = false },
            title = { Text(LocalizationManager.getString("language", language), fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    AppLanguage.entries.forEach { lang ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    viewModel.setLanguage(lang)
                                    showLanguageDialog = false
                                }
                                .padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(
                                selected = (language == lang),
                                onClick = {
                                    viewModel.setLanguage(lang)
                                    showLanguageDialog = false
                                }
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("${lang.flag}  ${lang.nativeName} (${lang.displayName})", fontSize = 14.sp)
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showLanguageDialog = false }) { Text("Close") }
            }
        )
    }

    // Currency Dialog
    if (showCurrencyDialog) {
        AlertDialog(
            onDismissRequest = { showCurrencyDialog = false },
            title = { Text(LocalizationManager.getString("currency", language), fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Currency.entries.forEach { curr ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    viewModel.setCurrency(curr)
                                    showCurrencyDialog = false
                                }
                                .padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(
                                selected = (currency == curr),
                                onClick = {
                                    viewModel.setCurrency(curr)
                                    showCurrencyDialog = false
                                }
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("${curr.code} (${curr.symbol}) - ${curr.label}", fontSize = 14.sp)
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showCurrencyDialog = false }) { Text("Close") }
            }
        )
    }

    // Safety Dialog
    if (showSafetyDialog) {
        AlertDialog(
            onDismissRequest = { showSafetyDialog = false },
            title = { Text("Safe Trading Guide", fontWeight = FontWeight.Bold) },
            text = {
                Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                    Text(
                        "1. Public Meetings: Always arrange meetings during daylight in busy, public areas (shopping plazas, bank branches, hotel lobbies).\n\n" +
                                "2. Inspection First: Verify the product's function, serial numbers, and physical condition before transferring any payment.\n\n" +
                                "3. Mobile Money Security: When using ZAAD, EVC Plus, Sahal, Telebirr, or M-Pesa, confirm the recipient name matches the seller.\n\n" +
                                "4. No Advance Payments: Never send money or delivery deposits to unknown sellers before receiving the goods.",
                        fontSize = 13.sp,
                        lineHeight = 20.sp
                    )
                }
            },
            confirmButton = { TextButton(onClick = { showSafetyDialog = false }) { Text("Understood") } }
        )
    }

    // Prohibited Products Dialog
    if (showProhibitedDialog) {
        AlertDialog(
            onDismissRequest = { showProhibitedDialog = false },
            title = { Text("Prohibited Listings Policy", fontWeight = FontWeight.Bold) },
            text = {
                Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                    Text(
                        "The following categories and items are strictly forbidden on East-Market:\n\n" +
                                "• Weapons, ammunition, explosives, and combat tactical gear\n" +
                                "• Prescription drugs, narcotics, and controlled substances\n" +
                                "• Counterfeit currency, forged documents, and identity papers\n" +
                                "• Stolen property, pirated media, and hacking devices\n" +
                                "• Endangered wildlife, ivory, and prohibited animal parts\n\n" +
                                "Violating listings are removed immediately and referred to regional authorities.",
                        fontSize = 13.sp,
                        lineHeight = 20.sp
                    )
                }
            },
            confirmButton = { TextButton(onClick = { showProhibitedDialog = false }) { Text("Close") } }
        )
    }

    // About Dialog
    if (showAboutDialog) {
        AlertDialog(
            onDismissRequest = { showAboutDialog = false },
            title = { Text("About East-Market", fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text(
                        "East-Market is a dedicated regional classifieds marketplace built to unite buyers and sellers across Somaliland, Somalia, Ethiopia, and Kenya.\n\n" +
                                "Features:\n" +
                                "• Multi-currency conversion (USD, SLSH, SOSH, ETB, KES)\n" +
                                "• Multilingual interface (English, Somali, Amharic, Swahili)\n" +
                                "• Direct WhatsApp, calling, and built-in chat\n" +
                                "• Verified seller badges and local community safety",
                        fontSize = 13.sp,
                        lineHeight = 19.sp
                    )
                }
            },
            confirmButton = { TextButton(onClick = { showAboutDialog = false }) { Text("Close") } }
        )
    }
}

@Composable
private fun SettingRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
    showArrow: Boolean = true,
    testTag: String = ""
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(16.dp)
            .testTag(testTag),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = title,
            tint = BrandNavy,
            modifier = Modifier.size(22.dp)
        )
        Spacer(modifier = Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(text = title, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Spacer(modifier = Modifier.height(2.dp))
            Text(text = subtitle, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if (showArrow) {
            Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color.Gray)
        }
    }
}
