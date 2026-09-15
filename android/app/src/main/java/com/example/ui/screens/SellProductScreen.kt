package com.example.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddPhotoAlternate
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
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
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.data.model.Currency
import com.example.data.model.ProductCondition
import com.example.domain.LocalizationManager
import com.example.ui.theme.BrandNavy
import com.example.ui.theme.BrandTeal
import com.example.ui.viewmodel.MarketplaceViewModel
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SellProductScreen(
    viewModel: MarketplaceViewModel,
    onListingSuccess: () -> Unit,
    modifier: Modifier = Modifier
) {
    val language by viewModel.selectedLanguage.collectAsState()
    val countries = viewModel.getCountries()
    val categories = viewModel.getCategories()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var priceText by remember { mutableStateOf("") }
    var selectedCurrency by remember { mutableStateOf(Currency.USD) }
    var selectedCategory by remember { mutableStateOf(categories.first()) }
    var selectedSubcategory by remember { mutableStateOf(categories.first().subcategories.first()) }
    var selectedCondition by remember { mutableStateOf(ProductCondition.NEW) }
    var selectedCountry by remember { mutableStateOf(countries[0]) }
    var selectedCity by remember { mutableStateOf(countries[0].cities.first()) }
    var phone by remember { mutableStateOf(countries[0].phonePrefix) }
    var whatsapp by remember { mutableStateOf(countries[0].phonePrefix) }
    var negotiable by remember { mutableStateOf(true) }
    var deliveryAvailable by remember { mutableStateOf(false) }
    var selectedImages by remember { mutableStateOf<List<Uri>>(emptyList()) }

    val maxPhotos = 5
    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickMultipleVisualMedia(maxPhotos)
    ) { uris ->
        if (uris.isNotEmpty()) {
            selectedImages = (selectedImages + uris).distinct().take(maxPhotos)
        }
    }

    var showCategoryDropdown by remember { mutableStateOf(false) }
    var showCountryDropdown by remember { mutableStateOf(false) }
    var showCityDropdown by remember { mutableStateOf(false) }
    var showCurrencyDropdown by remember { mutableStateOf(false) }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = LocalizationManager.getString("sell_something", language),
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = BrandNavy,
                    titleContentColor = Color.White
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            // Photo Upload card
            if (selectedImages.isEmpty()) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(130.dp)
                        .clickable {
                            photoPickerLauncher.launch(
                                PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                            )
                        }
                        .testTag("sell_add_photo_btn"),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                imageVector = Icons.Filled.AddPhotoAlternate,
                                contentDescription = "Upload Photos",
                                tint = BrandTeal,
                                modifier = Modifier.size(36.dp)
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "Add up to 5 Product Photos",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = "First photo will be primary (auto-optimized)",
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f)
                            )
                        }
                    }
                }
            } else {
                LazyRow(
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("sell_photo_row"),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(selectedImages) { uri ->
                        Box(
                            modifier = Modifier
                                .size(100.dp)
                        ) {
                            AsyncImage(
                                model = uri,
                                contentDescription = null,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .fillMaxSize()
                                    .clip(RoundedCornerShape(10.dp))
                            )
                            IconButton(
                                onClick = { selectedImages = selectedImages - uri },
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .size(24.dp)
                                    .background(Color.Black.copy(alpha = 0.5f), RoundedCornerShape(50))
                            ) {
                                Icon(
                                    Icons.Filled.Close,
                                    contentDescription = "Remove photo",
                                    tint = Color.White,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }
                    }
                    if (selectedImages.size < maxPhotos) {
                        item {
                            Card(
                                modifier = Modifier
                                    .size(100.dp)
                                    .clickable {
                                        photoPickerLauncher.launch(
                                            PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                                        )
                                    }
                                    .testTag("sell_add_photo_btn"),
                                shape = RoundedCornerShape(10.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                            ) {
                                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                    Icon(
                                        imageVector = Icons.Filled.AddPhotoAlternate,
                                        contentDescription = "Add more photos",
                                        tint = BrandTeal
                                    )
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Title
            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text(LocalizationManager.getString("title", language)) },
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("sell_title_input"),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Category Picker
            Box {
                OutlinedTextField(
                    value = "${selectedCategory.name} (${selectedSubcategory})",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text(LocalizationManager.getString("category", language)) },
                    trailingIcon = {
                        Icon(
                            Icons.Filled.ArrowDropDown,
                            contentDescription = null,
                            modifier = Modifier.clickable { showCategoryDropdown = true }
                        )
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { showCategoryDropdown = true }
                        .testTag("sell_category_picker")
                )

                DropdownMenu(
                    expanded = showCategoryDropdown,
                    onDismissRequest = { showCategoryDropdown = false }
                ) {
                    categories.forEach { cat ->
                        DropdownMenuItem(
                            text = { Text(cat.name, fontWeight = FontWeight.Bold) },
                            onClick = {
                                selectedCategory = cat
                                selectedSubcategory = cat.subcategories.firstOrNull() ?: ""
                                showCategoryDropdown = false
                            }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Condition Selection
            Text(
                text = LocalizationManager.getString("condition", language),
                fontWeight = FontWeight.SemiBold,
                fontSize = 13.sp
            )
            Spacer(modifier = Modifier.height(6.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                ProductCondition.entries.forEach { cond ->
                    FilterChip(
                        selected = selectedCondition == cond,
                        onClick = { selectedCondition = cond },
                        label = {
                            Text(
                                text = LocalizationManager.getConditionString(cond, language),
                                fontSize = 11.sp
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = BrandNavy,
                            selectedLabelColor = Color.White
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Price & Currency
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedTextField(
                    value = priceText,
                    onValueChange = { priceText = it },
                    label = { Text(LocalizationManager.getString("price", language)) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier
                        .weight(1.5f)
                        .testTag("sell_price_input"),
                    singleLine = true
                )

                Box(modifier = Modifier.weight(1f)) {
                    OutlinedTextField(
                        value = selectedCurrency.code,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text(LocalizationManager.getString("currency", language)) },
                        trailingIcon = {
                            Icon(Icons.Filled.ArrowDropDown, contentDescription = null)
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { showCurrencyDropdown = true }
                    )
                    DropdownMenu(
                        expanded = showCurrencyDropdown,
                        onDismissRequest = { showCurrencyDropdown = false }
                    ) {
                        Currency.entries.forEach { curr ->
                            DropdownMenuItem(
                                text = { Text("${curr.code} (${curr.symbol})") },
                                onClick = {
                                    selectedCurrency = curr
                                    showCurrencyDropdown = false
                                }
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Country & City Pickers
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Country
                Box(modifier = Modifier.weight(1f)) {
                    OutlinedTextField(
                        value = "${selectedCountry.flag} ${selectedCountry.name}",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text(LocalizationManager.getString("country", language)) },
                        trailingIcon = { Icon(Icons.Filled.ArrowDropDown, contentDescription = null) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { showCountryDropdown = true }
                    )
                    DropdownMenu(
                        expanded = showCountryDropdown,
                        onDismissRequest = { showCountryDropdown = false }
                    ) {
                        countries.forEach { c ->
                            DropdownMenuItem(
                                text = { Text("${c.flag} ${c.name}") },
                                onClick = {
                                    selectedCountry = c
                                    selectedCity = c.cities.firstOrNull() ?: ""
                                    phone = c.phonePrefix
                                    whatsapp = c.phonePrefix
                                    showCountryDropdown = false
                                }
                            )
                        }
                    }
                }

                // City
                Box(modifier = Modifier.weight(1f)) {
                    OutlinedTextField(
                        value = selectedCity,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text(LocalizationManager.getString("city", language)) },
                        trailingIcon = { Icon(Icons.Filled.ArrowDropDown, contentDescription = null) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { showCityDropdown = true }
                    )
                    DropdownMenu(
                        expanded = showCityDropdown,
                        onDismissRequest = { showCityDropdown = false }
                    ) {
                        selectedCountry.cities.forEach { city ->
                            DropdownMenuItem(
                                text = { Text(city) },
                                onClick = {
                                    selectedCity = city
                                    showCityDropdown = false
                                }
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Phone & WhatsApp
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = { Text(LocalizationManager.getString("phone", language)) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )

                OutlinedTextField(
                    value = whatsapp,
                    onValueChange = { whatsapp = it },
                    label = { Text(LocalizationManager.getString("whatsapp", language)) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Description
            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text(LocalizationManager.getString("description", language)) },
                minLines = 3,
                maxLines = 5,
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("sell_description_input")
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Toggles (Negotiable & Delivery)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(LocalizationManager.getString("negotiable", language), fontSize = 13.sp)
                Switch(checked = negotiable, onCheckedChange = { negotiable = it })
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(LocalizationManager.getString("delivery_available", language), fontSize = 13.sp)
                Switch(checked = deliveryAvailable, onCheckedChange = { deliveryAvailable = it })
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Publish Button
            Button(
                onClick = {
                    val priceNum = priceText.toDoubleOrNull()
                    if (title.isBlank()) {
                        scope.launch { snackbarHostState.showSnackbar("Please enter a title for your product") }
                        return@Button
                    }
                    if (priceNum == null || priceNum <= 0) {
                        scope.launch { snackbarHostState.showSnackbar("Please enter a valid price") }
                        return@Button
                    }
                    if (phone.isBlank()) {
                        scope.launch { snackbarHostState.showSnackbar("Please provide a contact phone number") }
                        return@Button
                    }

                    viewModel.postNewListing(
                        title = title.trim(),
                        description = description.trim(),
                        categoryId = selectedCategory.id,
                        subcategory = selectedSubcategory,
                        price = priceNum,
                        currencyCode = selectedCurrency.code,
                        condition = selectedCondition,
                        country = selectedCountry.name,
                        city = selectedCity,
                        phone = phone.trim(),
                        whatsapp = whatsapp.trim(),
                        negotiable = negotiable,
                        deliveryAvailable = deliveryAvailable,
                        imageUris = selectedImages.map { it.toString() },
                        onSuccess = onListingSuccess
                    )
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
                    .testTag("sell_submit_btn"),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BrandNavy)
            ) {
                Text(
                    text = LocalizationManager.getString("submit_listing", language),
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            }

            Spacer(modifier = Modifier.height(40.dp))
        }
    }
}
