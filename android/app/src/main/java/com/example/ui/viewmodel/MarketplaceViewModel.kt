package com.example.ui.viewmodel

import kotlinx.coroutines.flow.combine
import com.example.data.model.ChatMessage
import com.example.data.model.Conversation
import com.example.data.model.HomeAd
import com.example.data.remote.ProfileDto
import com.example.data.repository.NotSignedInException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
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
import com.example.data.remote.NetworkModule
import com.example.data.repository.AuthRepository
import com.example.data.repository.AuthState
import com.example.data.repository.MarketplaceRepository
import com.example.data.session.SessionManager
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

    private val moshi = NetworkModule.provideMoshi()
    private val sessionManager = SessionManager(application)
    private val authApi = NetworkModule.provideAuthApi(sessionManager, moshi)
    val authRepository = AuthRepository(authApi, sessionManager, moshi)
    private val backendApi = NetworkModule.provideBackendApi(sessionManager, authRepository, moshi)

    val repository = MarketplaceRepository(database, backendApi, authRepository)

    val authState: StateFlow<AuthState> = authRepository.authState

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

    // The tick lets a refresh re-run the same query: the filter has not
    // changed, so flatMapLatest alone would not fetch again.
    private val _refreshTick = MutableStateFlow(0)

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    val products: StateFlow<List<Product>> = combine(_filter, _refreshTick) { criteria, _ -> criteria }
        .flatMapLatest { criteria -> repository.getProducts(criteria) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val featuredProducts: StateFlow<List<Product>> = repository.getFeaturedProducts()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val favoriteProducts: StateFlow<List<Product>> = repository.getFavoriteProducts()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val conversations: StateFlow<List<Conversation>> = repository.conversations

    /** Home carousel promotions, the same slides as the web app's hero. */
    val homeAds: StateFlow<List<HomeAd>> = repository.homeAds

    /** The signed-in user's profile, for showing their name. */
    val profile: StateFlow<ProfileDto?> = repository.profile

    private val _snackbarEvent = MutableSharedFlow<String>()
    val snackbarEvent: SharedFlow<String> = _snackbarEvent.asSharedFlow()

    // Selected product for details
    private val _selectedProduct = MutableStateFlow<Product?>(null)
    val selectedProduct: StateFlow<Product?> = _selectedProduct.asStateFlow()

    // Selected conversation
    private val _activeConversationId = MutableStateFlow<String?>(null)
    val activeConversationId: StateFlow<String?> = _activeConversationId.asStateFlow()

    private val _activeMessages = MutableStateFlow<List<ChatMessage>>(emptyList())
    val activeMessages: StateFlow<List<ChatMessage>> = _activeMessages.asStateFlow()

    private var messagePolling: Job? = null

    init {
        // Keeps the Messages badge current while the app is open.
        viewModelScope.launch {
            while (isActive) {
                delay(30_000)
                if (authState.value is AuthState.SignedIn) repository.refreshConversations()
            }
        }
    }

    fun selectProduct(product: Product) {
        _selectedProduct.value = product
        viewModelScope.launch {
            repository.incrementViews(product.id)
            // The card only carries list fields; hydrate the description,
            // real contact info and full image set from the detail endpoint.
            repository.getProductById(product.id)?.let { detail ->
                if (_selectedProduct.value?.id == product.id) {
                    _selectedProduct.value = detail.copy(isFavorite = _selectedProduct.value?.isFavorite ?: detail.isFavorite)
                }
            }
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

    /**
     * The home page's two entry points. "photo" keeps the grid to listings that
     * were photographed; the video half of the marketplace has its own
     * full-screen feed, so mixing the two in one grid helps nobody.
     */
    fun showPhotoListingsOnly(only: Boolean) {
        _filter.value = _filter.value.copy(media = if (only) "photo" else null)
    }

    /** Listings with a video, for the full-screen feed. */
    private val _videoProducts = MutableStateFlow<List<Product>>(emptyList())
    val videoProducts: StateFlow<List<Product>> = _videoProducts.asStateFlow()

    private val _isLoadingVideos = MutableStateFlow(false)
    val isLoadingVideos: StateFlow<Boolean> = _isLoadingVideos.asStateFlow()

    private val _videoCategoryId = MutableStateFlow<String?>(null)
    val videoCategoryId: StateFlow<String?> = _videoCategoryId.asStateFlow()

    fun loadVideoProducts(categoryId: String? = _videoCategoryId.value) {
        _videoCategoryId.value = categoryId
        viewModelScope.launch {
            _isLoadingVideos.value = true
            _videoProducts.value = repository.getVideoProducts(categoryId)
            _isLoadingVideos.value = false
        }
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
            val result = repository.toggleFavorite(product.id, product.isFavorite)
            if (result.isSuccess) {
                if (_selectedProduct.value?.id == product.id) {
                    _selectedProduct.value = _selectedProduct.value?.copy(isFavorite = !product.isFavorite)
                }
            } else {
                _snackbarEvent.emit("Sign in to save favorites")
            }
        }
    }

    fun startChatForProduct(product: Product, onConversationReady: (String) -> Unit) {
        viewModelScope.launch {
            repository.startConversation(product)
                .onSuccess { convId ->
                    _activeConversationId.value = convId
                    onConversationReady(convId)
                }
                .onFailure { error ->
                    _snackbarEvent.emit(
                        if (error is NotSignedInException) "Sign in to message the seller"
                        else error.message ?: "Could not start the conversation"
                    )
                }
        }
    }

    /**
     * Loads a conversation's history and keeps it fresh (every 4 seconds) while
     * the chat is on screen, marking the other person's messages read.
     */
    fun openConversation(convId: String) {
        if (_activeConversationId.value != convId) _activeMessages.value = emptyList()
        _activeConversationId.value = convId
        messagePolling?.cancel()
        messagePolling = viewModelScope.launch {
            while (isActive) {
                repository.getMessages(convId).onSuccess { history ->
                    val pending = _activeMessages.value.filter { it.pending }
                    _activeMessages.value = (history + pending).distinctBy { it.id }
                    if (history.any { !it.isFromMe && it.readAt == null }) {
                        repository.markConversationRead(convId)
                    }
                }
                delay(4_000)
            }
        }
    }

    /** Stops refreshing when the chat closes, and updates the inbox previews. */
    fun closeConversation() {
        messagePolling?.cancel()
        messagePolling = null
        viewModelScope.launch { repository.refreshConversations() }
    }

    /** Pull to refresh, and the toolbar refresh button. */
    fun refreshAll() {
        if (_isRefreshing.value) return
        viewModelScope.launch {
            _isRefreshing.value = true
            runCatching { repository.refreshAll() }
            _refreshTick.value += 1
            _isRefreshing.value = false
        }
    }

    fun refreshConversations() {
        viewModelScope.launch { repository.refreshConversations() }
    }

    fun sendMessage(text: String) {
        val convId = _activeConversationId.value ?: return
        val body = text.trim()
        if (body.isEmpty()) return

        // Shown straight away as "Sending…", then swapped for the saved message.
        val tempId = "pending_${System.currentTimeMillis()}"
        _activeMessages.value = _activeMessages.value + ChatMessage(
            id = tempId,
            conversationId = convId,
            senderId = "me",
            senderName = "You",
            text = body,
            timestamp = System.currentTimeMillis(),
            isFromMe = true,
            pending = true
        )

        viewModelScope.launch {
            repository.sendMessage(convId, body)
                .onSuccess { saved ->
                    _activeMessages.value = (_activeMessages.value.filterNot { it.id == tempId } + saved).distinctBy { it.id }
                }
                .onFailure {
                    _activeMessages.value = _activeMessages.value.filterNot { it.id == tempId }
                    _snackbarEvent.emit("Message not sent. Check your connection and try again.")
                }
        }
    }

    fun onAdClicked(ad: HomeAd) = repository.recordAdClick(ad.id)

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
        imageUris: List<String> = emptyList(),
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
                imageUrls = imageUris.ifEmpty { listOf("img_hero_banner") },
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

    /* -------------------------------------------------------------------- */
    /* Auth                                                                  */
    /* -------------------------------------------------------------------- */

    private val _authError = MutableStateFlow<String?>(null)
    val authError: StateFlow<String?> = _authError.asStateFlow()

    private val _authLoading = MutableStateFlow(false)
    val authLoading: StateFlow<Boolean> = _authLoading.asStateFlow()

    fun clearAuthError() {
        _authError.value = null
    }

    fun signIn(email: String, password: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _authLoading.value = true
            _authError.value = null
            val result = authRepository.signIn(email.trim(), password)
            _authLoading.value = false
            result.onSuccess {
                _snackbarEvent.emit("Welcome back!")
                onSuccess()
            }.onFailure { _authError.value = it.message ?: "Sign in failed" }
        }
    }

    fun signUp(email: String, password: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _authLoading.value = true
            _authError.value = null
            val result = authRepository.signUp(email.trim(), password)
            _authLoading.value = false
            result.onSuccess {
                if (authState.value is AuthState.SignedIn) {
                    _snackbarEvent.emit("Account created!")
                    onSuccess()
                } else {
                    _snackbarEvent.emit("Check your email to confirm your account")
                    onSuccess()
                }
            }.onFailure { _authError.value = it.message ?: "Sign up failed" }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            authRepository.signOut()
            _snackbarEvent.emit("Signed out")
        }
    }
}
