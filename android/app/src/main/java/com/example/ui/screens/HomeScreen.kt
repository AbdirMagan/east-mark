package com.example.ui.screens

import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material.icons.filled.Refresh
import android.content.Intent
import android.net.Uri
import androidx.compose.ui.platform.LocalContext
import com.example.ui.components.HomeCarousel
import com.example.ui.components.welcomeAd
import com.example.ui.navigation.Screen
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
import androidx.compose.foundation.BorderStroke
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
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
    onNavigate: (String) -> Unit = {},
    modifier: Modifier = Modifier
) {
    val language by viewModel.selectedLanguage.collectAsState()
    val displayCurrency by viewModel.selectedCurrency.collectAsState()
    val selectedCountry by viewModel.selectedCountry.collectAsState()
    val selectedCity by viewModel.selectedCity.collectAsState()
    val filter by viewModel.filter.collectAsState()
    val products by viewModel.products.collectAsState()
    val featuredProducts by viewModel.featuredProducts.collectAsState()
    val homeAds by viewModel.homeAds.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val context = LocalContext.current


    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // --- BODY: PRODUCTS & CONTENT GRID ---
        // Pull down to reload listings, categories, locations, promotions and
        // the inbox -- the same refresh the toolbar button runs.
        PullToRefreshBox(
            isRefreshing = isRefreshing,
            onRefresh = { viewModel.refreshAll() },
            modifier = Modifier.fillMaxSize()
        ) {
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
                // Same promotions as the web hero, managed in the admin dashboard.
                HomeCarousel(
                    ads = homeAds.ifEmpty { listOf(welcomeAd()) },
                    onAdClick = { ad ->
                        viewModel.onAdClicked(ad)
                        when (ad.targetType) {
                            "category" -> ad.categoryId?.let { viewModel.filterByCategory(it.toString()) }
                            "search" -> viewModel.updateSearchQuery(ad.targetValue.orEmpty())
                            "url" -> {
                                val target = ad.targetValue.orEmpty()
                                when {
                                    target == "/sell" -> onNavigate(Screen.Sell.route)
                                    target.startsWith("https://") -> runCatching {
                                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(target)))
                                    }
                                }
                            }
                        }
                    }
                )
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
                                leadingIcon = {
                                    Icon(
                                        painter = painterResource(id = categoryIconRes(category)),
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp)
                                    )
                                },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = BrandNavy,
                                    selectedLabelColor = Color.White
                                )
                            )
                        }
                    }
                }
            }

            // The two ways to browse. Photos stay in this grid; video gets its
            // own full-screen feed, because a grid of muted thumbnails is the
            // worst way to show something that was filmed.
            item(span = { GridItemSpan(2) }) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
                ) {
                    BrowseModeButton(
                        title = LocalizationManager.getString("photo_listings", language),
                        subtitle = LocalizationManager.getString("photo_listings_hint", language),
                        iconRes = R.drawable.ic_cat_electronics,
                        selected = filter.media == "photo",
                        onClick = { viewModel.showPhotoListingsOnly(filter.media != "photo") },
                        modifier = Modifier.weight(1f)
                    )
                    BrowseModeButton(
                        title = LocalizationManager.getString("video_listings", language),
                        subtitle = LocalizationManager.getString("video_listings_hint", language),
                        icon = Icons.Filled.PlayArrow,
                        selected = false,
                        onClick = { onNavigate(Screen.VideoFeed.route) },
                        modifier = Modifier.weight(1f)
                    )
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

/**
 * The same category glyphs as the web app (web/src/components/ui/Icon.tsx).
 * Categories come from the backend with numeric ids, so this keys on the icon
 * name the API sends (or the slug the offline fallback uses).
 */
private fun categoryIconRes(category: CategoryItem): Int = when (category.iconName.lowercase()) {
    "electronics", "cpu", "devices" -> R.drawable.ic_cat_electronics
    "house", "home", "houses" -> R.drawable.ic_cat_house
    "car", "cars", "directionscar" -> R.drawable.ic_cat_car
    "land", "map", "landscape" -> R.drawable.ic_cat_land
    "livestock", "cow", "pets" -> R.drawable.ic_cat_livestock
    "goods", "home-office-goods", "chair" -> R.drawable.ic_cat_goods
    else -> R.drawable.ic_cat_electronics
}

/**
 * One of the two browse buttons under the categories: a title, a line of
 * explanation, and an icon. Photos toggle the grid's filter in place; video
 * opens its own screen.
 */
@Composable
private fun BrowseModeButton(
    title: String,
    subtitle: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    iconRes: Int? = null,
    icon: androidx.compose.ui.graphics.vector.ImageVector? = null
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(14.dp),
        color = if (selected) BrandNavy else MaterialTheme.colorScheme.surface,
        border = BorderStroke(
            1.dp,
            if (selected) BrandNavy else MaterialTheme.colorScheme.outlineVariant
        ),
        modifier = modifier
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(10.dp)
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(34.dp)
                    .clip(CircleShape)
                    .background(if (selected) Color.White.copy(alpha = 0.18f) else BrandTeal.copy(alpha = 0.12f))
            ) {
                when {
                    icon != null -> Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = if (selected) Color.White else BrandTeal,
                        modifier = Modifier.size(18.dp)
                    )
                    iconRes != null -> Icon(
                        painter = painterResource(id = iconRes),
                        contentDescription = null,
                        tint = if (selected) Color.White else BrandTeal,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.width(8.dp))

            Column {
                Text(
                    text = title,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (selected) Color.White else MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = subtitle,
                    fontSize = 10.sp,
                    maxLines = 2,
                    color = if (selected) Color.White.copy(alpha = 0.8f)
                            else MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
