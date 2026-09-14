package com.example.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.local.AppDatabase
import com.example.data.model.AppLanguage
import com.example.data.model.CategoryItem
import com.example.data.model.Country
import com.example.data.model.Currency
import com.example.data.model.FilterCriteria
import com.example.data.model.Product
import com.example.data.model.ProductCondition
import com.example.data.model.Seller
import com.example.data.model.SortOption
import com.example.data.repository.MarketplaceRepository
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

@OptIn(ExperimentalCoroutinesApi::class)
class MarketplaceViewModel(application: Application) : AndroidViewModel(application) {

    private val database = AppDatabase.getDatabase(application)
    val repository = MarketplaceRepository(database)

    val selectedLanguage: StateFlow<AppLanguage> = repository.selectedLanguage
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), AppLanguage.ENGLISH)

    val selectedCurrency: StateFlow<Currency> = repository.selectedCurrency
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), Currency.USD)

    val selectedCountry: StateFlow<Country> = repository.selectedCountry
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), repository.getCountries()[0])

    val selectedCity: StateFlow<String> = repository.selectedCity
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "Hargeisa")

    val isDataSaverEnabled: StateFlow<Boolean> = repository.isDataSaverEnabled
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    private val _filter = MutableStateFlow(FilterCriteria())
    val filter: StateFlow<FilterCriteria> = _filter.asStateFlow()

    val products: StateFlow<List<Product>> = _filter
        .flatMapLatest { criteria -> repository.getProducts(criteria) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val featuredProducts: StateFlow<List<Product>> = repository.getFeaturedProducts()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val favoriteProducts: StateFlow<List<Product>> = repository.getFavoriteProducts()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val conversations = repository.getConversations()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _snackbarEvent = MutableSharedFlow<String>()
    val snackbarEvent: SharedFlow<String> = _snackbarEvent.asSharedFlow()

    // Selected product for details
    private val _selectedProduct = MutableStateFlow<Product?>(null)
    val selectedProduct: StateFlow<Product?> = _selectedProduct.asStateFlow()

    // Selected conversation
    private val _activeConversationId = MutableStateFlow<String?>(null)
    val activeConversationId: StateFlow<String?> = _activeConversationId.asStateFlow()

    val activeMessages = _activeConversationId.flatMapLatest { convId ->
        if (convId != null) repository.getMessages(convId) else kotlinx.coroutines.flow.flowOf(emptyList())
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun selectProduct(product: Product) {
        _selectedProduct.value = product
        viewModelScope.launch {
            repository.incrementViews(product.id)
        }
    }

    fun clearSelectedProduct() {
        _selectedProduct.value = null
    }

    fun setLanguage(language: AppLanguage) {
        repository.setLanguage(language)
    }

    fun setCurrency(currency: Currency) {
        repository.setCurrency(currency)
    }

    fun setCountry(country: Country) {
        repository.setCountry(country)
    }

    fun setCity(city: String) {
        repository.setCity(city)
    }

    fun setDataSaver(enabled: Boolean) {
        repository.setDataSaver(enabled)
    }

    fun updateSearchQuery(query: String) {
        _filter.value = _filter.value.copy(query = query)
    }

    fun filterByCategory(categoryId: String?) {
        _filter.value = _filter.value.copy(categoryId = categoryId)
    }

    fun filterByLocation(country: String?, city: String?) {
        _filter.value = _filter.value.copy(country = country, city = city)
    }

    fun setSortOption(sortOption: SortOption) {
        _filter.value = _filter.value.copy(sortBy = sortOption)
    }

    fun applyFilters(
        minPrice: Double?,
        maxPrice: Double?,
        condition: ProductCondition?,
        verifiedOnly: Boolean,
        deliveryOnly: Boolean,
        sortOption: SortOption
    ) {
        _filter.value = _filter.value.copy(
            minPrice = minPrice,
            maxPrice = maxPrice,
            condition = condition,
            verifiedOnly = verifiedOnly,
            deliveryOnly = deliveryOnly,
            sortBy = sortOption
        )
    }

    fun resetFilters() {
        _filter.value = FilterCriteria()
    }

    fun toggleFavorite(product: Product) {
        viewModelScope.launch {
            repository.toggleFavorite(product.id, product.isFavorite)
            if (_selectedProduct.value?.id == product.id) {
                _selectedProduct.value = _selectedProduct.value?.copy(isFavorite = !product.isFavorite)
            }
        }
    }

    fun startChatForProduct(product: Product, onConversationReady: (String) -> Unit) {
        viewModelScope.launch {
            val convId = repository.createOrGetConversation(product)
            _activeConversationId.value = convId
            onConversationReady(convId)
        }
    }

    fun openConversation(convId: String) {
        _activeConversationId.value = convId
    }

    fun sendMessage(text: String) {
        val convId = _activeConversationId.value ?: return
        if (text.isBlank()) return
        viewModelScope.launch {
            repository.sendMessage(convId, text, "Buyer")
        }
    }

    fun postNewListing(
        title: String,
        description: String,
        categoryId: String,
        subcategory: String,
        price: Double,
        currencyCode: String,
        condition: ProductCondition,
        country: String,
        city: String,
        phone: String,
        whatsapp: String,
        negotiable: Boolean,
        deliveryAvailable: Boolean,
        onSuccess: () -> Unit
    ) {
        viewModelScope.launch {
            val newId = "prod_${System.currentTimeMillis()}"
            val product = Product(
                id = newId,
                title = title,
                description = description,
                categoryId = categoryId,
                subcategory = subcategory,
                price = price,
                originalCurrency = currencyCode,
                condition = condition,
                country = country,
                city = city,
                sellerId = "seller_me",
                sellerName = "My Business Store",
                sellerPhone = phone,
                sellerWhatsapp = whatsapp,
                isVerifiedSeller = true,
                isBusinessSeller = false,
                imageUrls = listOf("img_hero_banner"),
                negotiable = negotiable,
                deliveryAvailable = deliveryAvailable,
                createdAt = System.currentTimeMillis()
            )
            repository.insertProduct(product)
            _snackbarEvent.emit("Listing published successfully!")
            onSuccess()
        }
    }

    fun reportProduct(productId: String, reason: String) {
        viewModelScope.launch {
            _snackbarEvent.emit("Report submitted. Our moderation team will review it.")
        }
    }

    fun getCategories(): List<CategoryItem> = repository.getCategories()
    fun getCountries(): List<Country> = repository.getCountries()
    fun getSeller(sellerId: String): Seller = repository.getSeller(sellerId)
    fun getSellerProducts(sellerId: String) = repository.getSellerProducts(sellerId)
}
