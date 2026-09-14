package com.example.data.repository

import com.example.data.local.AppDatabase
import com.example.data.local.DatabaseInitializer
import com.example.data.local.entity.ConversationEntity
import com.example.data.local.entity.FavoriteEntity
import com.example.data.local.entity.MessageEntity
import com.example.data.local.entity.ProductEntity
import com.example.data.model.AppLanguage
import com.example.data.model.CategoryItem
import com.example.data.model.Country
import com.example.data.model.Currency
import com.example.data.model.FilterCriteria
import com.example.data.model.Product
import com.example.data.model.Seller
import com.example.data.model.SortOption
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch

class MarketplaceRepository(private val database: AppDatabase) {

    private val productDao = database.productDao()
    private val favoriteDao = database.favoriteDao()
    private val messageDao = database.messageDao()

    private val _selectedLanguage = MutableStateFlow(AppLanguage.ENGLISH)
    val selectedLanguage: Flow<AppLanguage> = _selectedLanguage.asStateFlow()

    private val _selectedCurrency = MutableStateFlow(Currency.USD)
    val selectedCurrency: Flow<Currency> = _selectedCurrency.asStateFlow()

    private val _selectedCountry = MutableStateFlow(DatabaseInitializer.COUNTRIES[0]) // Somaliland
    val selectedCountry: Flow<Country> = _selectedCountry.asStateFlow()

    private val _selectedCity = MutableStateFlow("Hargeisa")
    val selectedCity: Flow<String> = _selectedCity.asStateFlow()

    private val _isDataSaverEnabled = MutableStateFlow(false)
    val isDataSaverEnabled: Flow<Boolean> = _isDataSaverEnabled.asStateFlow()

    private val _hasCompletedOnboarding = MutableStateFlow(true)
    val hasCompletedOnboarding: Flow<Boolean> = _hasCompletedOnboarding.asStateFlow()

    init {
        CoroutineScope(Dispatchers.IO).launch {
            DatabaseInitializer.seedDatabase(productDao, messageDao)
        }
    }

    fun getCategories(): List<CategoryItem> = DatabaseInitializer.CATEGORIES

    fun getCountries(): List<Country> = DatabaseInitializer.COUNTRIES

    fun setLanguage(language: AppLanguage) {
        _selectedLanguage.value = language
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

    fun getProducts(filter: FilterCriteria): Flow<List<Product>> {
        val rawProductsFlow = productDao.getAllProducts()
        val favoritesFlow = favoriteDao.getAllFavoriteIds()

        return combine(rawProductsFlow, favoritesFlow) { entities, favIds ->
            val domainList = entities.map { entity ->
                entity.toDomain(isFavorite = favIds.contains(entity.id))
            }

            domainList.filter { product ->
                // Search query match
                val matchesQuery = filter.query.isBlank() ||
                        product.title.contains(filter.query, ignoreCase = true) ||
                        product.description.contains(filter.query, ignoreCase = true) ||
                        product.city.contains(filter.query, ignoreCase = true) ||
                        product.subcategory.contains(filter.query, ignoreCase = true)

                // Category filter
                val matchesCategory = filter.categoryId == null || product.categoryId == filter.categoryId

                // Country filter
                val matchesCountry = filter.country == null || product.country.equals(filter.country, ignoreCase = true)

                // City filter
                val matchesCity = filter.city == null || product.city.equals(filter.city, ignoreCase = true)

                // Min/Max Price filter
                val matchesMinPrice = filter.minPrice == null || product.price >= filter.minPrice
                val matchesMaxPrice = filter.maxPrice == null || product.price <= filter.maxPrice

                // Condition filter
                val matchesCondition = filter.condition == null || product.condition == filter.condition

                // Verified seller only
                val matchesVerified = !filter.verifiedOnly || product.isVerifiedSeller

                // Delivery only
                val matchesDelivery = !filter.deliveryOnly || product.deliveryAvailable

                matchesQuery && matchesCategory && matchesCountry && matchesCity &&
                        matchesMinPrice && matchesMaxPrice && matchesCondition &&
                        matchesVerified && matchesDelivery
            }.let { filtered ->
                when (filter.sortBy) {
                    SortOption.NEWEST -> filtered.sortedByDescending { it.createdAt }
                    SortOption.PRICE_LOW_HIGH -> filtered.sortedBy { it.price }
                    SortOption.PRICE_HIGH_LOW -> filtered.sortedByDescending { it.price }
                    SortOption.POPULAR -> filtered.sortedByDescending { it.views }
                }
            }
        }
    }

    fun getFeaturedProducts(): Flow<List<Product>> {
        return combine(productDao.getFeaturedProducts(), favoriteDao.getAllFavoriteIds()) { entities, favIds ->
            entities.map { it.toDomain(isFavorite = favIds.contains(it.id)) }
        }
    }

    fun getFavoriteProducts(): Flow<List<Product>> {
        return combine(productDao.getAllProducts(), favoriteDao.getAllFavoriteIds()) { entities, favIds ->
            entities.filter { favIds.contains(it.id) }.map { it.toDomain(isFavorite = true) }
        }
    }

    suspend fun getProductById(id: String): Product? {
        val entity = productDao.getProductById(id) ?: return null
        return entity.toDomain()
    }

    suspend fun incrementViews(productId: String) {
        productDao.incrementViews(productId)
    }

    suspend fun toggleFavorite(productId: String, isFav: Boolean) {
        if (isFav) {
            favoriteDao.removeFavorite(productId)
        } else {
            favoriteDao.addFavorite(FavoriteEntity(productId))
        }
    }

    suspend fun insertProduct(product: Product) {
        productDao.insertProduct(ProductEntity.fromDomain(product))
    }

    fun getConversations(): Flow<List<ConversationEntity>> = messageDao.getAllConversations()

    fun getMessages(conversationId: String): Flow<List<MessageEntity>> = messageDao.getMessagesForConversation(conversationId)

    suspend fun sendMessage(conversationId: String, text: String, senderName: String) {
        val now = System.currentTimeMillis()
        val msg = MessageEntity(
            id = "msg_${now}",
            conversationId = conversationId,
            senderId = "user_me",
            senderName = senderName,
            text = text,
            timestamp = now,
            isFromMe = true
        )
        messageDao.insertMessage(msg)
        messageDao.updateLastMessage(conversationId, text, now)
    }

    suspend fun createOrGetConversation(product: Product): String {
        val convId = "conv_${product.sellerId}_${product.id}"
        val existing = ConversationEntity(
            id = convId,
            otherUserId = product.sellerId,
            otherUserName = product.sellerName,
            otherUserAvatar = product.sellerAvatar,
            lastMessage = "Started chat about ${product.title}",
            lastTimestamp = System.currentTimeMillis(),
            unreadCount = 0,
            productId = product.id,
            productTitle = product.title,
            productPrice = product.price,
            productCurrency = product.originalCurrency,
            productImage = product.imageUrls.firstOrNull() ?: ""
        )
        messageDao.insertConversation(existing)
        return convId
    }

    fun getSeller(sellerId: String): Seller {
        return DatabaseInitializer.SAMPLE_SELLERS.firstOrNull { it.id == sellerId }
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

    fun getSellerProducts(sellerId: String): Flow<List<Product>> {
        return combine(productDao.getProductsBySeller(sellerId), favoriteDao.getAllFavoriteIds()) { entities, favIds ->
            entities.map { it.toDomain(isFavorite = favIds.contains(it.id)) }
        }
    }
}
