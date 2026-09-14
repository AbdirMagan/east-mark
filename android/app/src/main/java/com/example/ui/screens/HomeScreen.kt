package com.example.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Surface
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.R
import com.example.data.model.CategoryItem
import com.example.data.model.Country
import com.example.data.model.Currency
import com.example.data.model.Product
import com.example.domain.LocalizationManager
import com.example.ui.components.FilterBottomSheet
import com.example.ui.components.ProductCard
import com.example.ui.theme.BrandGold
import com.example.ui.theme.BrandNavy
import com.example.ui.theme.BrandTeal
import com.example.ui.viewmodel.MarketplaceViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    viewModel: MarketplaceViewModel,
    onProductClick: (Product) -> Unit,
    onCategoryClick: (CategoryItem) -> Unit,
    modifier: Modifier = Modifier
) {
    val language by viewModel.selectedLanguage.collectAsState()
    val displayCurrency by viewModel.selectedCurrency.collectAsState()
    val selectedCountry by viewModel.selectedCountry.collectAsState()
    val selectedCity by viewModel.selectedCity.collectAsState()
    val filter by viewModel.filter.collectAsState()
    val products by viewModel.products.collectAsState()
    val featuredProducts by viewModel.featuredProducts.collectAsState()

    var showFilterSheet by remember { mutableStateOf(false) }
    var showLocationDialog by remember { mutableStateOf(false) }
    var showCurrencyDropdown by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // --- HEADER BAR ---
        Surface(
            color = BrandNavy,
            shadowElevation = 4.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                // Top Row: Logo, Location Badge, Currency Switcher, Notification
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    // Logo and title
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.clickable { viewModel.resetFilters() }
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.img_app_icon),
                            contentDescription = "East-Market",
                            modifier = Modifier
                                .size(34.dp)
                                .clip(RoundedCornerShape(8.dp))
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text(
                                text = "East-Market",
                                color = Color.White,
                                fontWeight = FontWeight.Black,
                                fontSize = 18.sp,
                                letterSpacing = 0.5.sp
                            )
                            Text(
                                text = LocalizationManager.getString("app_tagline", language),
                                color = BrandTeal.copy(alpha = 0.9f),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }

                    // Location & Currency buttons
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        // Location chip
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
                                Text(
                                    text = selectedCountry.flag,
                                    fontSize = 12.sp
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = selectedCity,
                                    color = Color.White,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold
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

                        // Currency switcher button
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
                                                Text("${curr.code} (${curr.symbol}) - ${curr.label}", fontSize = 13.sp)
                                                if (curr == displayCurrency) {
                                                    Spacer(modifier = Modifier.width(8.dp))
                                                    Icon(Icons.Filled.Check, contentDescription = null, tint = BrandTeal, modifier = Modifier.size(16.dp))
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

                Spacer(modifier = Modifier.height(10.dp))

                // Search Bar + Filter Button
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
                                    Icon(Icons.Filled.Clear, contentDescription = "Clear", tint = Color.White)
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

        // --- BODY: PRODUCTS & CONTENT GRID ---
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 12.dp)
                .testTag("home_products_grid"),
            contentPadding = PaddingValues(top = 12.dp, bottom = 80.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Hero Banner
            item(span = { GridItemSpan(2) }) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(130.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .testTag("promo_hero_banner"),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Box(modifier = Modifier.fillMaxSize()) {
                        Image(
                            painter = painterResource(id = R.drawable.img_hero_banner),
                            contentDescription = "Hero banner",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(
                                    Brush.horizontalGradient(
                                        listOf(BrandNavy.copy(alpha = 0.85f), Color.Transparent)
                                    )
                                )
                        )
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(14.dp),
                            verticalArrangement = Arrangement.Center
                        ) {
                            Text(
                                text = "Buy & Sell Across East Africa",
                                color = Color.White,
                                fontWeight = FontWeight.Black,
                                fontSize = 16.sp
                            )
                            Spacer(modifier = Modifier.height(3.dp))
                            Text(
                                text = "Verified sellers • Direct WhatsApp & Phone • Multi-Currency",
                                color = Color.White.copy(alpha = 0.85f),
                                fontSize = 11.sp
                            )
                        }
                    }
                }
            }

            // Categories horizontal bar
            item(span = { GridItemSpan(2) }) {
                Column(modifier = Modifier.padding(vertical = 6.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = LocalizationManager.getString("categories", language),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                        if (filter.categoryId != null) {
                            Text(
                                text = "Clear filter",
                                fontSize = 12.sp,
                                color = BrandTeal,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier
                                    .clickable { viewModel.filterByCategory(null) }
                                    .padding(4.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        items(viewModel.getCategories()) { category ->
                            val isSelected = filter.categoryId == category.id
                            FilterChip(
                                selected = isSelected,
                                onClick = {
                                    if (isSelected) viewModel.filterByCategory(null)
                                    else viewModel.filterByCategory(category.id)
                                },
                                label = { Text(category.name, fontSize = 12.sp) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = BrandNavy,
                                    selectedLabelColor = Color.White
                                )
                            )
                        }
                    }
                }
            }

            // Section Header
            item(span = { GridItemSpan(2) }) {
                val headerTitle = when {
                    filter.query.isNotBlank() -> "Results for \"${filter.query}\""
                    filter.categoryId != null -> "Filtered Category"
                    else -> LocalizationManager.getString("recent_listings", language)
                }
                Text(
                    text = "$headerTitle (${products.size})",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground,
                    modifier = Modifier.padding(top = 4.dp, bottom = 2.dp)
                )
            }

            // Empty state if no products found
            if (products.isEmpty()) {
                item(span = { GridItemSpan(2) }) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 40.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = LocalizationManager.getString("no_products_found", language),
                                fontSize = 15.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            TextButton(onClick = { viewModel.resetFilters() }) {
                                Text("Reset Filters", color = BrandTeal, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            } else {
                items(products, key = { it.id }) { product ->
                    ProductCard(
                        product = product,
                        displayCurrency = displayCurrency,
                        language = language,
                        onClick = { onProductClick(product) },
                        onFavoriteToggle = { viewModel.toggleFavorite(product) }
                    )
                }
            }
        }
    }

    // Filter Bottom Sheet
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

    // Country & City Picker Dialog
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

@Composable
fun LocationPickerDialog(
    countries: List<Country>,
    selectedCountry: Country,
    selectedCity: String,
    onLocationSelected: (Country, String) -> Unit,
    onDismiss: () -> Unit
) {
    var tempCountry by remember { mutableStateOf(selectedCountry) }
    var tempCity by remember { mutableStateOf(selectedCity) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text("Select Your Location", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        },
        text = {
            Column {
                Text("Select Country:", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    countries.forEach { c ->
                        FilterChip(
                            selected = tempCountry.id == c.id,
                            onClick = {
                                tempCountry = c
                                tempCity = c.cities.firstOrNull() ?: ""
                            },
                            label = { Text("${c.flag} ${c.name}", fontSize = 12.sp) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = BrandNavy,
                                selectedLabelColor = Color.White
                            )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
                Text("Select City in ${tempCountry.name}:", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                Spacer(modifier = Modifier.height(6.dp))

                Column {
                    tempCountry.cities.forEach { city ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { tempCity = city }
                                .padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(
                                selected = tempCity == city,
                                onClick = { tempCity = city }
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(city, fontSize = 14.sp)
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onLocationSelected(tempCountry, tempCity) }
            ) {
                Text("Confirm Location", fontWeight = FontWeight.Bold, color = BrandTeal)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
