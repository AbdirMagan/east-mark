package com.example.data.repository

import kotlinx.coroutines.coroutineScope
import com.example.data.model.ChatMessage
import com.example.data.model.Conversation
import com.example.data.model.HomeAd
import com.example.data.remote.ApiException
import com.example.data.remote.ProfileDto
import com.example.data.remote.SendMessageBody
import com.example.data.remote.StartConversationBody
import kotlinx.coroutines.flow.StateFlow
import org.json.JSONObject
import retrofit2.HttpException
import com.example.data.local.AppDatabase
import com.example.data.local.DatabaseInitializer
import com.example.data.local.entity.ProductEntity
import com.example.data.model.AppLanguage
import com.example.data.model.CategoryItem
import com.example.data.model.Country
import com.example.data.model.Currency
import com.example.data.model.FilterCriteria
import com.example.data.model.Product
import com.example.data.model.Seller
import com.example.data.model.SortOption
import com.example.data.remote.BackendApi
import com.example.data.remote.toDomain
import com.example.data.remote.toSeller
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.launch

/**
 * Categories, locations, products and favorites now come from the East-Market
 * backend API (see BackendApi). Messaging also comes from the backend now (the
 * same conversations as the web app), and so does the home carousel. The "Sell"
 * draft flow still uses the local Room database: keeping Sell local avoids the location-id and image-upload plumbing a real
 * submission needs — see README.md's status table.
 */
class MarketplaceRepository(
    private val database: AppDatabase,
    private val backendApi: BackendApi,
    private val authRepository: AuthRepository
) {
    private val messageDao = database.messageDao()
    private val productDao = database.productDao()

    private val ioScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    private val _selectedLanguage = MutableStateFlow(AppLanguage.ENGLISH)
    val selectedLanguage: Flow<AppLanguage> = _selectedLanguage.asStateFlow()

    private val _selectedCurrency = MutableStateFlow(Currency.USD)
    val selectedCurrency: Flow<Currency> = _selectedCurrency.asStateFlow()

    private val fallbackCountry = DatabaseInitializer.COUNTRIES[0]
    private val _selectedCountry = MutableStateFlow(fallbackCountry)
    val selectedCountry: Flow<Country> = _selectedCountry.asStateFlow()

    private val _selectedCity = MutableStateFlow("Hargeisa")
    val selectedCity: Flow<String> = _selectedCity.asStateFlow()

    private val _isDataSaverEnabled = MutableStateFlow(false)
    val isDataSaverEnabled: Flow<Boolean> = _isDataSaverEnabled.asStateFlow()

    private val _hasCompletedOnboarding = MutableStateFlow(true)
    val hasCompletedOnboarding: Flow<Boolean> = _hasCompletedOnboarding.asStateFlow()

    private val _categories = MutableStateFlow<List<CategoryItem>>(DatabaseInitializer.CATEGORIES)

    private val _countries = MutableStateFlow<List<Country>>(DatabaseInitializer.COUNTRIES)

    private val _featuredProducts = MutableStateFlow<List<Product>>(emptyList())
    private val _favoriteProducts = MutableStateFlow<List<Product>>(emptyList())
    private val _sellerCache = MutableStateFlow<Map<String, Seller>>(emptyMap())

    init {
        ioScope.launch { runCatching { DatabaseInitializer.seedDatabase(productDao, messageDao) } }
        ioScope.launch { loadCategories() }
        ioScope.launch { loadCountries() }
        ioScope.launch { refreshFeatured() }
        ioScope.launch { refreshHomeAds() }
        ioScope.launch {
            authRepository.authState.collect { state ->
                if (state is AuthState.SignedIn) {
                    refreshFavorites()
                    refreshProfile()
                    refreshConversations()
                } else {
                    _favoriteProducts.value = emptyList()
                    _profile.value = null
                    _conversations.value = emptyList()
                }
            }
        }
    }

    private suspend fun loadCategories() {
        runCatching { backendApi.getCategories() }
            .onSuccess { envelope ->
                val roots = envelope.data.orEmpty().filter { it.parentId == null }
                if (roots.isNotEmpty()) _categories.value = roots.map { it.toDomain() }
            }
    }

    private suspend fun loadCountries() {
        runCatching { backendApi.getCountries() }
            .onSuccess { envelope ->
                val dtos = envelope.data.orEmpty()
                if (dtos.isEmpty()) return
                val mapped = dtos.map { dto ->
                    val cities = runCatching { backendApi.getCities(countryId = dto.id, major = true) }
                        .getOrNull()?.data.orEmpty().map { it.name }
                    dto.toDomain(cities)
                }
                _countries.value = mapped
                // Keep the selected country pointing at a live entry with the same id.
                val current = _selectedCountry.value
                mapped.firstOrNull { it.id == current.id }?.let { _selectedCountry.value = it }
            }
    }

    private suspend fun refreshFeatured() {
        val params = mapOf("featuredOnly" to "true", "limit" to "20", "sort" to "newest")
        runCatching { backendApi.searchProducts(params) }
            .onSuccess { envelope -> _featuredProducts.value = envelope.data.orEmpty().map { it.toDomain() } }
    }

    private suspend fun refreshFavorites() {
        runCatching { backendApi.getFavorites() }
            .onSuccess { envelope ->
                _favoriteProducts.value = envelope.data.orEmpty().map { it.toDomain().copy(isFavorite = true) }
            }
    }

    fun getCategories(): List<CategoryItem> = _categories.value

    fun getCountries(): List<Country> = _countries.value

    fun setLanguage(language: AppLanguage) {
        _selectedLanguage.value = language
        ioScope.launch { refreshHomeAds() }
    }

    fun setCurrency(currency: Currency) {
        _selectedCurrency.value = currency
    }

    fun setCountry(country: Country) {
        _selectedCountry.value = country
        if (!country.cities.contains(_selectedCity.value)) {
            _selectedCity.value = country.cities.firstOrNull() ?: ""
        }
        _selectedCurrency.value = Currency.fromCode(country.defaultCurrency)
        ioScope.launch { refreshHomeAds() }
    }

    fun setCity(city: String) {
        _selectedCity.value = city
    }

    fun setDataSaver(enabled: Boolean) {
        _isDataSaverEnabled.value = enabled
    }

    fun setOnboardingCompleted(completed: Boolean) {
        _hasCompletedOnboarding.value = completed
    }

    private fun buildSearchParams(filter: FilterCriteria): Map<String, String> {
        val params = mutableMapOf<String, String>()
        if (filter.query.isNotBlank()) params["q"] = filter.query
        filter.categoryId?.toIntOrNull()?.let { params["categoryId"] = it.toString() }
        filter.minPrice?.let { params["minPrice"] = it.toString() }
        filter.maxPrice?.let { params["maxPrice"] = it.toString() }
        filter.condition?.let { params["conditions"] = it.key }
        if (filter.verifiedOnly) params["verifiedOnly"] = "true"
        if (filter.deliveryOnly) params["deliveryOnly"] = "true"
        params["sort"] = when (filter.sortBy) {
            SortOption.NEWEST -> "newest"
            SortOption.PRICE_LOW_HIGH -> "price_asc"
            SortOption.PRICE_HIGH_LOW -> "price_desc"
            SortOption.POPULAR -> "popular"
        }
        params["limit"] = "50"
        return params
    }

    fun getProducts(filter: FilterCriteria): Flow<List<Product>> = flow {
        val result = runCatching { backendApi.searchProducts(buildSearchParams(filter)) }
            .getOrNull()?.data.orEmpty()
            .map { it.toDomain() }
        emit(result)
    }

    fun getFeaturedProducts(): Flow<List<Product>> = _featuredProducts.asStateFlow()

    fun getFavoriteProducts(): Flow<List<Product>> = _favoriteProducts.asStateFlow()

    suspend fun getProductById(id: String): Product? =
        runCatching { backendApi.getProduct(id) }.getOrNull()?.data?.toDomain()

    suspend fun incrementViews(productId: String) {
        runCatching { backendApi.recordView(productId) }
    }

    /** Returns failure when the caller must be signed in to save favorites. */
    suspend fun toggleFavorite(productId: String, isFav: Boolean): Result<Unit> {
        if (authRepository.authState.value !is AuthState.SignedIn) {
            return Result.failure(NotSignedInException())
        }
        val result = runCatching {
            if (isFav) backendApi.removeFavorite(productId) else backendApi.addFavorite(productId)
        }
        if (result.isSuccess) refreshFavorites()
        return result.map { }
    }

    suspend fun insertProduct(product: Product) {
        productDao.insertProduct(ProductEntity.fromDomain(product))
    }

    /* Promotions ----------------------------------------------------------- */

    private val _homeAds = MutableStateFlow<List<HomeAd>>(emptyList())
    val homeAds: StateFlow<List<HomeAd>> = _homeAds.asStateFlow()

    /** Reloads the carousel in the chosen language and for the chosen country. */
    suspend fun refreshHomeAds() {
        val countryId = _selectedCountry.value.id.toIntOrNull()
        runCatching { backendApi.getAds(lang = _selectedLanguage.value.code, countryId = countryId) }
            .onSuccess { envelope -> _homeAds.value = envelope.data.orEmpty().map { it.toDomain() } }
    }

    fun recordAdClick(adId: String) {
        if (adId.startsWith("fallback")) return
        ioScope.launch { runCatching { backendApi.recordAdClick(adId) } }
    }

    /* Profile -------------------------------------------------------------- */

    private val _profile = MutableStateFlow<ProfileDto?>(null)
    /** The signed-in user's profile (name, username); null when signed out. */
    val profile: StateFlow<ProfileDto?> = _profile.asStateFlow()

    private suspend fun refreshProfile() {
        runCatching { backendApi.getMe() }.onSuccess { envelope -> _profile.value = envelope.data }
    }

    /**
     * Everything the home screen shows, reloaded in one pass: categories,
     * locations, featured listings, the promotions carousel and -- when signed
     * in -- favourites, the profile and the inbox. Run in parallel, because on
     * a slow connection doing these one after another is a visible wait.
     */
    suspend fun refreshAll() = coroutineScope {
        launch { loadCategories() }
        launch { loadCountries() }
        launch { refreshFeatured() }
        launch { refreshHomeAds() }
        if (authRepository.authState.value is AuthState.SignedIn) {
            launch { refreshFavorites() }
            launch { refreshProfile() }
            launch { refreshConversations() }
        }
    }

    /* Messages ------------------------------------------------------------- */
    // The same conversations as the web app, from the backend's /messages API.
    // Row level security keeps each thread between its buyer and seller.

    private val _conversations = MutableStateFlow<List<Conversation>>(emptyList())
    val conversations: StateFlow<List<Conversation>> = _conversations.asStateFlow()

    suspend fun refreshConversations(): Result<Unit> {
        if (authRepository.authState.value !is AuthState.SignedIn) {
            _conversations.value = emptyList()
            return Result.failure(NotSignedInException())
        }
        return runCatching { backendApi.getConversations() }
            .map { envelope -> _conversations.value = envelope.data.orEmpty().map { it.toDomain() } }
    }

    /** The conversation's history, oldest first. */
    suspend fun getMessages(conversationId: String): Result<List<ChatMessage>> = runCatching {
        val otherName = _conversations.value.firstOrNull { it.id == conversationId }?.otherUserName ?: ""
        backendApi.getMessages(conversationId).data?.items.orEmpty().map { it.toDomain(otherName) }
    }

    suspend fun sendMessage(conversationId: String, text: String): Result<ChatMessage> = runCatching {
        val otherName = _conversations.value.firstOrNull { it.id == conversationId }?.otherUserName ?: ""
        val saved = backendApi.sendMessage(conversationId, SendMessageBody(text)).data
            ?: throw ApiException("Message not sent")
        saved.toDomain(otherName)
    }

    suspend fun markConversationRead(conversationId: String) {
        runCatching { backendApi.markConversationRead(conversationId) }
        _conversations.value = _conversations.value.map {
            if (it.id == conversationId) it.copy(unreadCount = 0) else it
        }
    }

    /** Opens (or reopens) the thread with this listing's seller and returns its id. */
    suspend fun startConversation(product: Product): Result<String> {
        if (authRepository.authState.value !is AuthState.SignedIn) {
            return Result.failure(NotSignedInException())
        }
        val result = runCatching {
            backendApi.startConversation(StartConversationBody(product.id)).data?.id
                ?: throw ApiException("Could not start the conversation")
        }
        if (result.isSuccess) refreshConversations()
        return result.recoverCatching { error -> throw ApiException(readableError(error)) }
    }

    /** The backend's own message ("You cannot message yourself...") where there is one. */
    private fun readableError(error: Throwable): String {
        if (error is ApiException) return error.message ?: "Something went wrong"
        if (error is HttpException) {
            val raw = runCatching { error.response()?.errorBody()?.string() }.getOrNull()
            val message = raw?.let { runCatching { JSONObject(it).optString("message") }.getOrNull() }
            if (!message.isNullOrBlank()) return message
        }
        return "Check your connection and try again"
    }

    fun getSeller(sellerId: String): Seller {
        return _sellerCache.value[sellerId]
            ?: DatabaseInitializer.SAMPLE_SELLERS.firstOrNull { it.id == sellerId }
            ?: Seller(
                id = sellerId,
                name = "East Africa Marketplace Seller",
                username = "east_seller",
                phone = "+252634400000",
                whatsapp = "+252634400000",
                country = _selectedCountry.value.name,
                city = _selectedCity.value,
                isVerified = true,
                isBusiness = false,
                rating = 4.8f,
                reviewCount = 24,
                joinedDate = "2023",
                about = "Trusted local seller on East-Market."
            )
    }

    fun getSellerProducts(sellerId: String): Flow<List<Product>> = flow {
        val cards = runCatching { backendApi.searchProducts(mapOf("sellerId" to sellerId, "limit" to "50")) }
            .getOrNull()?.data.orEmpty()
        cards.firstOrNull()?.let { first ->
            val seller = first.toSeller(_selectedCountry.value.name, _selectedCity.value)
            _sellerCache.value = _sellerCache.value + (sellerId to seller)
        }
        emit(cards.map { it.toDomain() })
    }
}

class NotSignedInException : Exception("Sign in to do that")
