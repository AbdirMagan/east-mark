package com.example.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.R
import com.example.data.model.Currency
import com.example.domain.LocalizationManager
import com.example.ui.screens.LocationPickerDialog
import com.example.ui.theme.BrandGold
import com.example.ui.theme.BrandNavy
import com.example.ui.theme.BrandTeal
import com.example.ui.viewmodel.MarketplaceViewModel

/**
 * The application header, on every screen.
 *
 * One header, not one per screen: the logo, the city, the currency and the
 * search box are the things a buyer reaches for wherever they are, and a
 * marketplace where they disappear when you open a listing feels like two
 * different apps. Screens that are somewhere other than home get a back arrow
 * in the same bar, and can add their own actions on the right.
 *
 * @param title shown instead of the brand name on an inner screen.
 * @param showSearch the search row. Off on screens where typing a query would
 *   have nowhere to go, such as a conversation.
 */
@Composable
fun EastMarketHeader(
    viewModel: MarketplaceViewModel,
    modifier: Modifier = Modifier,
    title: String? = null,
    showSearch: Boolean = true,
    onBack: (() -> Unit)? = null,
    actions: @Composable RowScope.() -> Unit = {}
) {
    val language by viewModel.selectedLanguage.collectAsState()
    val displayCurrency by viewModel.selectedCurrency.collectAsState()
    val selectedCountry by viewModel.selectedCountry.collectAsState()
    val selectedCity by viewModel.selectedCity.collectAsState()
    val filter by viewModel.filter.collectAsState()

    var showFilterSheet by remember { mutableStateOf(false) }
    var showLocationDialog by remember { mutableStateOf(false) }
    var showCurrencyDropdown by remember { mutableStateOf(false) }

    Surface(color = BrandNavy, shadowElevation = 4.dp, modifier = modifier) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f, fill = false)
                ) {
                    if (onBack != null) {
                        IconButton(
                            onClick = onBack,
                            modifier = Modifier.size(32.dp).testTag("header_back_btn")
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = LocalizationManager.getString("back", language),
                                tint = Color.White
                            )
                        }
                        Spacer(modifier = Modifier.width(6.dp))
                    }

                    // The East Market emblem, cut from the same artwork as the web
                    // header logo and the launcher icon.
                    Image(
                        painter = painterResource(id = R.drawable.ic_logo_mark),
                        contentDescription = "East-Market",
                        modifier = Modifier.size(34.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text(
                            text = title ?: "East-Market",
                            color = Color.White,
                            fontWeight = FontWeight.Black,
                            fontSize = if (title == null) 18.sp else 16.sp,
                            letterSpacing = 0.5.sp,
                            maxLines = 1
                        )
                        // The tagline is dropped on inner screens: with a back
                        // arrow and a title in the same row there is not enough
                        // width left, and a half-cut tagline reads as a bug.
                        if (onBack == null) {
                            Text(
                                text = LocalizationManager.getString("app_tagline", language),
                                color = BrandTeal.copy(alpha = 0.9f),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Medium,
                                maxLines = 1
                            )
                        }
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    actions()

                    Surface(
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .clickable { showLocationDialog = true }
                            .testTag("header_location_chip"),
                        color = Color.White.copy(alpha = 0.15f)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(text = selectedCountry.flag, fontSize = 12.sp)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = selectedCity,
                                color = Color.White,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                maxLines = 1
                            )
                            Icon(
                                imageVector = Icons.Filled.ArrowDropDown,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(6.dp))

                    Box {
                        Surface(
                            modifier = Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .clickable { showCurrencyDropdown = true }
                                .testTag("currency_switcher_btn"),
                            color = BrandGold.copy(alpha = 0.25f)
                        ) {
                            Text(
                                text = displayCurrency.code,
                                color = BrandGold,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp)
                            )
                        }

                        DropdownMenu(
                            expanded = showCurrencyDropdown,
                            onDismissRequest = { showCurrencyDropdown = false }
                        ) {
                            Currency.entries.forEach { curr ->
                                DropdownMenuItem(
                                    text = {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Text(
                                                "${curr.code} (${curr.symbol}) - ${curr.label}",
                                                fontSize = 13.sp
                                            )
                                            if (curr == displayCurrency) {
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Icon(
                                                    Icons.Filled.Check,
                                                    contentDescription = null,
                                                    tint = BrandTeal,
                                                    modifier = Modifier.size(16.dp)
                                                )
                                            }
                                        }
                                    },
                                    onClick = {
                                        viewModel.setCurrency(curr)
                                        showCurrencyDropdown = false
                                    }
                                )
                            }
                        }
                    }
                }
            }

            if (showSearch) {
                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = filter.query,
                        onValueChange = { viewModel.updateSearchQuery(it) },
                        placeholder = {
                            Text(
                                text = LocalizationManager.getString("search_placeholder", language),
                                fontSize = 13.sp,
                                color = Color.White.copy(alpha = 0.6f)
                            )
                        },
                        leadingIcon = {
                            Icon(
                                imageVector = Icons.Filled.Search,
                                contentDescription = "Search",
                                tint = Color.White.copy(alpha = 0.8f)
                            )
                        },
                        trailingIcon = {
                            if (filter.query.isNotEmpty()) {
                                IconButton(onClick = { viewModel.updateSearchQuery("") }) {
                                    Icon(
                                        Icons.Filled.Clear,
                                        contentDescription = "Clear",
                                        tint = Color.White
                                    )
                                }
                            }
                        },
                        modifier = Modifier
                            .weight(1f)
                            .height(50.dp)
                            .testTag("search_input"),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = Color.White.copy(alpha = 0.15f),
                            unfocusedContainerColor = Color.White.copy(alpha = 0.12f),
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            cursorColor = BrandTeal,
                            focusedBorderColor = BrandTeal,
                            unfocusedBorderColor = Color.Transparent
                        )
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    IconButton(
                        onClick = { viewModel.refreshAll() },
                        modifier = Modifier
                            .size(50.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color.White.copy(alpha = 0.14f))
                            .testTag("refresh_btn")
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Refresh,
                            contentDescription = "Refresh",
                            tint = Color.White
                        )
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    IconButton(
                        onClick = { showFilterSheet = true },
                        modifier = Modifier
                            .size(50.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(BrandTeal)
                            .testTag("filter_icon_btn")
                    ) {
                        Icon(
                            imageVector = Icons.Filled.FilterList,
                            contentDescription = "Filters",
                            tint = Color.White
                        )
                    }
                }
            }
        }
    }

    if (showFilterSheet) {
        FilterBottomSheet(
            initialFilter = filter,
            language = language,
            onApply = { min, max, cond, verified, delivery, sort ->
                viewModel.applyFilters(min, max, cond, verified, delivery, sort)
                showFilterSheet = false
            },
            onReset = {
                viewModel.resetFilters()
                showFilterSheet = false
            },
            onDismiss = { showFilterSheet = false }
        )
    }

    if (showLocationDialog) {
        LocationPickerDialog(
            countries = viewModel.getCountries(),
            selectedCountry = selectedCountry,
            selectedCity = selectedCity,
            onLocationSelected = { country, city ->
                viewModel.setCountry(country)
                viewModel.setCity(city)
                showLocationDialog = false
            },
            onDismiss = { showLocationDialog = false }
        )
    }
}
