package com.example.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.example.data.local.entity.ConversationEntity
import com.example.data.local.entity.FavoriteEntity
import com.example.data.local.entity.MessageEntity
import com.example.data.local.entity.ProductEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductDao {
    @Query("SELECT * FROM products ORDER BY createdAt DESC")
    fun getAllProducts(): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE isFeatured = 1 ORDER BY createdAt DESC")
    fun getFeaturedProducts(): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE id = :productId LIMIT 1")
    suspend fun getProductById(productId: String): ProductEntity?

    @Query("SELECT * FROM products WHERE categoryId = :categoryId ORDER BY createdAt DESC")
    fun getProductsByCategory(categoryId: String): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE country = :country ORDER BY createdAt DESC")
    fun getProductsByCountry(country: String): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE sellerId = :sellerId ORDER BY createdAt DESC")
    fun getProductsBySeller(sellerId: String): Flow<List<ProductEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProducts(products: List<ProductEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProduct(product: ProductEntity)

    @Update
    suspend fun updateProduct(product: ProductEntity)

    @Query("UPDATE products SET views = views + 1 WHERE id = :productId")
    suspend fun incrementViews(productId: String)

    @Query("DELETE FROM products WHERE id = :productId")
    suspend fun deleteProduct(productId: String)
}

@Dao
interface FavoriteDao {
    @Query("SELECT productId FROM favorites")
    fun getAllFavoriteIds(): Flow<List<String>>

    @Query("SELECT EXISTS(SELECT 1 FROM favorites WHERE productId = :productId)")
    fun isFavorite(productId: String): Flow<Boolean>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun addFavorite(favorite: FavoriteEntity)

    @Query("DELETE FROM favorites WHERE productId = :productId")
    suspend fun removeFavorite(productId: String)
}

@Dao
interface MessageDao {
    @Query("SELECT * FROM conversations ORDER BY lastTimestamp DESC")
    fun getAllConversations(): Flow<List<ConversationEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertConversation(conversation: ConversationEntity)

    @Query("SELECT * FROM messages WHERE conversationId = :convId ORDER BY timestamp ASC")
    fun getMessagesForConversation(convId: String): Flow<List<MessageEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessage(message: MessageEntity)

    @Query("UPDATE conversations SET lastMessage = :lastMsg, lastTimestamp = :time WHERE id = :convId")
    suspend fun updateLastMessage(convId: String, lastMsg: String, time: Long)

    @Query("UPDATE conversations SET unreadCount = 0 WHERE id = :convId")
    suspend fun markAsRead(convId: String)
}
