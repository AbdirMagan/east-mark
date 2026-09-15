package com.example.data.local

import com.example.data.local.dao.MessageDao
import com.example.data.local.dao.ProductDao
import com.example.data.local.entity.ConversationEntity
import com.example.data.local.entity.MessageEntity
import com.example.data.local.entity.ProductEntity
import com.example.data.model.CategoryItem
import com.example.data.model.Country
import com.example.data.model.ProductCondition
import com.example.data.model.Seller

object DatabaseInitializer {

    val COUNTRIES = listOf(
        Country(
            id = "somaliland",
            name = "Somaliland",
            // No emoji: the Somalia flag is wrong for Somaliland.
            flag = "",
            defaultCurrency = "SLSH",
            phonePrefix = "+252",
            cities = listOf("Hargeisa", "Berbera", "Burco", "Borama", "Gabiley", "Las Anod")
        ),
        Country(
            id = "somalia",
            name = "Somalia",
            flag = "🇸🇴",
            defaultCurrency = "USD",
            phonePrefix = "+252",
            cities = listOf("Mogadishu", "Kismayo", "Bosaso", "Baidoa", "Galkayo")
        ),
        Country(
            id = "ethiopia",
            name = "Ethiopia",
            flag = "🇪🇹",
            defaultCurrency = "ETB",
            phonePrefix = "+251",
            cities = listOf("Addis Ababa", "Dire Dawa", "Jijiga", "Harar", "Hawassa", "Bahir Dar")
        ),
        Country(
            id = "kenya",
            name = "Kenya",
            flag = "🇰🇪",
            defaultCurrency = "KES",
            phonePrefix = "+254",
            cities = listOf("Nairobi", "Mombasa", "Garissa", "Wajir", "Mandera", "Kisumu", "Nakuru")
        ),
        Country(
            id = "djibouti",
            name = "Djibouti",
            flag = "🇩🇯",
            defaultCurrency = "DJF",
            phonePrefix = "+253",
            cities = listOf("Djibouti", "Ali Sabieh", "Dikhil", "Tadjourah", "Obock", "Arta")
        )
    )

    // Mirrors the live catalogue (supabase/migrations/0016_trim_categories.sql):
    // Electronics, Houses, Cars, Lands, Livestock.
    val CATEGORIES = listOf(
        CategoryItem("electronics", "Electronics", "Devices", listOf("Smartphones", "Tablets", "Laptops", "Desktops", "Smart TVs", "Audio & Sound", "Cameras", "Gaming")),
        CategoryItem("houses", "Houses", "Home", listOf("Houses for Sale", "Houses for Rent", "Apartments", "Villas")),
        CategoryItem("cars", "Cars", "DirectionsCar", listOf("Sedans", "4x4 / SUVs", "Pickups", "Toyota", "Nissan")),
        CategoryItem("land", "Lands", "Landscape", listOf("Residential Land", "Commercial Plots", "Agricultural Land")),
        CategoryItem("livestock", "Livestock", "Pets", listOf("Camels", "Goats & Sheep", "Cattle", "Poultry"))
    )

    val SAMPLE_SELLERS = listOf(
        Seller(
            id = "seller_1",
            name = "Guled Tech Solutions",
            username = "guled_tech",
            phone = "+252634421100",
            whatsapp = "+252634421100",
            country = "Somaliland",
            city = "Hargeisa",
            isVerified = true,
            isBusiness = true,
            businessName = "Guled Tech Electronics Ltd",
            rating = 4.9f,
            reviewCount = 84,
            joinedDate = "March 2022",
            about = "Leading certified electronics importer in Somaliland. Genuine devices with warranty."
        ),
        Seller(
            id = "seller_2",
            name = "Amina Hassan Auto",
            username = "amina_motors",
            phone = "+252615598700",
            whatsapp = "+252615598700",
            country = "Somalia",
            city = "Mogadishu",
            isVerified = true,
            isBusiness = true,
            businessName = "Banaadir Prime Motors",
            rating = 4.8f,
            reviewCount = 52,
            joinedDate = "January 2021",
            about = "Imported quality cars directly from Dubai and Japan with full inspection certificates."
        ),
        Seller(
            id = "seller_3",
            name = "Dawit Real Estate",
            username = "dawit_properties",
            phone = "+251911223344",
            whatsapp = "+251911223344",
            country = "Ethiopia",
            city = "Addis Ababa",
            isVerified = true,
            isBusiness = true,
            businessName = "Bole Horizon Properties",
            rating = 4.95f,
            reviewCount = 110,
            joinedDate = "June 2020",
            about = "Verified real estate broker specializing in apartments, luxury villas, and commercial plots across Addis Ababa and Jijiga."
        ),
        Seller(
            id = "seller_4",
            name = "Mohamed Noor Livestock",
            username = "noor_pastoral",
            phone = "+254712345678",
            whatsapp = "+254712345678",
            country = "Kenya",
            city = "Nairobi",
            isVerified = true,
            isBusiness = false,
            rating = 4.7f,
            reviewCount = 38,
            joinedDate = "August 2023",
            about = "Healthy pastoral livestock from Northern Kenya and Garissa. Camels, Boran cattle, and Somali sheep."
        )
    )

    suspend fun seedDatabase(productDao: ProductDao, messageDao: MessageDao) {
        val now = System.currentTimeMillis()
        val products = listOf(
            ProductEntity(
                id = "prod_1",
                title = "iPhone 15 Pro Max - 256GB Natural Titanium (Dual SIM)",
                description = "Brand new in box, sealed Apple iPhone 15 Pro Max. Physical Dual SIM version popular in East Africa. Includes 1-year warranty and original receipt. Free delivery in Hargeisa.",
                categoryId = "electronics",
                subcategory = "iPhones",
                price = 1150.0,
                originalCurrency = "USD",
                condition = ProductCondition.NEW.name,
                country = "Somaliland",
                city = "Hargeisa",
                district = "Shacabka",
                sellerId = "seller_1",
                sellerName = "Guled Tech Solutions",
                sellerPhone = "+252634421100",
                sellerWhatsapp = "+252634421100",
                sellerAvatar = "",
                isVerifiedSeller = true,
                isBusinessSeller = true,
                imageUrls = "img_electronics",
                views = 342,
                isFeatured = true,
                negotiable = true,
                deliveryAvailable = true,
                createdAt = now - 3600000 * 2
            ),
            ProductEntity(
                id = "prod_2",
                title = "Toyota Land Cruiser Prado TXL 2021 - Diesel",
                description = "Excellent condition Prado TXL 2021. Sunroof, leather interior, 7-seater, low mileage 34,000 km. Pristine condition with complete maintenance history in Mogadishu.",
                categoryId = "cars",
                subcategory = "4x4 / SUVs",
                price = 38500.0,
                originalCurrency = "USD",
                condition = ProductCondition.LIKE_NEW.name,
                country = "Somalia",
                city = "Mogadishu",
                district = "Hodan",
                sellerId = "seller_2",
                sellerName = "Amina Hassan Auto",
                sellerPhone = "+252615598700",
                sellerWhatsapp = "+252615598700",
                sellerAvatar = "",
                isVerifiedSeller = true,
                isBusinessSeller = true,
                imageUrls = "img_vehicle",
                views = 789,
                isFeatured = true,
                negotiable = true,
                deliveryAvailable = false,
                createdAt = now - 3600000 * 8
            ),
            ProductEntity(
                id = "prod_3",
                title = "MacBook Pro 16\" M3 Pro (18GB / 512GB SSD) Space Black",
                description = "Barely used for 2 months, 99% battery health. Comes with original MagSafe charger and premium protective sleeve. Ideal for developers, video editors, and businesses.",
                categoryId = "electronics",
                subcategory = "Laptops",
                price = 220000.0,
                originalCurrency = "KES",
                condition = ProductCondition.LIKE_NEW.name,
                country = "Kenya",
                city = "Nairobi",
                district = "Westlands",
                sellerId = "seller_1",
                sellerName = "Guled Tech Solutions",
                sellerPhone = "+254712345678",
                sellerWhatsapp = "+254712345678",
                sellerAvatar = "",
                isVerifiedSeller = true,
                isBusinessSeller = true,
                imageUrls = "img_electronics",
                views = 210,
                isFeatured = true,
                negotiable = true,
                deliveryAvailable = true,
                createdAt = now - 3600000 * 12
            ),
            ProductEntity(
                id = "prod_4",
                title = "Modern 3-Bedroom Luxury Apartment in Bole",
                description = "Spacious 180 sqm luxury apartment with panoramic views of Addis Ababa. Modern European kitchen fittings, backup generator, dedicated parking, 24/7 security.",
                categoryId = "houses",
                subcategory = "Furnished Apartments",
                price = 14500000.0,
                originalCurrency = "ETB",
                condition = ProductCondition.NEW.name,
                country = "Ethiopia",
                city = "Addis Ababa",
                district = "Bole Medhanealem",
                sellerId = "seller_3",
                sellerName = "Dawit Real Estate",
                sellerPhone = "+251911223344",
                sellerWhatsapp = "+251911223344",
                sellerAvatar = "",
                isVerifiedSeller = true,
                isBusinessSeller = true,
                imageUrls = "img_hero_banner",
                views = 1205,
                isFeatured = true,
                negotiable = true,
                deliveryAvailable = false,
                createdAt = now - 3600000 * 24
            ),
            ProductEntity(
                id = "prod_5",
                title = "Somali Dairy & Breeding Camels (Geel Caano Badan)",
                description = "Purebred Somali pastoral camels bred for high milk yield and resilience. Inspected by veterinary doctors with all vaccination records ready. Bulk discounts available.",
                categoryId = "livestock",
                subcategory = "Camels",
                price = 850.0,
                originalCurrency = "USD",
                condition = ProductCondition.NEW.name,
                country = "Somaliland",
                city = "Burco",
                district = "Saylada Burco",
                sellerId = "seller_4",
                sellerName = "Mohamed Noor Livestock",
                sellerPhone = "+252634421100",
                sellerWhatsapp = "+252634421100",
                sellerAvatar = "",
                isVerifiedSeller = true,
                isBusinessSeller = false,
                imageUrls = "img_hero_banner",
                views = 430,
                isFeatured = false,
                negotiable = true,
                deliveryAvailable = true,
                createdAt = now - 3600000 * 36
            ),
            ProductEntity(
                id = "prod_6",
                title = "Solar Hybrid Power System 5kVA with Lithium Battery",
                description = "Complete solar solution for homes and clinics. Includes 5kVA pure sine inverter, 5kWh LiFePO4 battery, 6x 550W Tier 1 panels. Cut generator costs drastically.",
                categoryId = "electronics",
                subcategory = "Solar Panels",
                price = 2800.0,
                originalCurrency = "USD",
                condition = ProductCondition.NEW.name,
                country = "Somalia",
                city = "Mogadishu",
                district = "Wadajir",
                sellerId = "seller_1",
                sellerName = "Guled Tech Solutions",
                sellerPhone = "+252615598700",
                sellerWhatsapp = "+252615598700",
                sellerAvatar = "",
                isVerifiedSeller = true,
                isBusinessSeller = true,
                imageUrls = "img_electronics",
                views = 195,
                isFeatured = false,
                negotiable = false,
                deliveryAvailable = true,
                createdAt = now - 3600000 * 48
            ),
            ProductEntity(
                id = "prod_7",
                title = "Samsung 65\" QLED 4K Smart TV with HDR10+",
                description = "Brand new unboxed 65 inch Samsung QLED TV. YouTube, Netflix, Shahid, Apple AirPlay built in. Crystal clear display, 1 year warranty.",
                categoryId = "electronics",
                subcategory = "Smart TVs",
                price = 72000.0,
                originalCurrency = "ETB",
                condition = ProductCondition.NEW.name,
                country = "Ethiopia",
                city = "Dire Dawa",
                district = "Kebele 02",
                sellerId = "seller_3",
                sellerName = "Dawit Real Estate",
                sellerPhone = "+251911223344",
                sellerWhatsapp = "+251911223344",
                sellerAvatar = "",
                isVerifiedSeller = true,
                isBusinessSeller = true,
                imageUrls = "img_electronics",
                views = 160,
                isFeatured = false,
                negotiable = true,
                deliveryAvailable = true,
                createdAt = now - 3600000 * 50
            ),
            ProductEntity(
                id = "prod_8",
                title = "Toyota HiAce 14-Seater Passenger Van 2019",
                description = "Diesel manual transmission, very clean engine and interior. Ready for public transport or staff shuttle operations. Clean title.",
                categoryId = "cars",
                subcategory = "Vans",
                price = 2400000.0,
                originalCurrency = "KES",
                condition = ProductCondition.USED.name,
                country = "Kenya",
                city = "Garissa",
                district = "Central",
                sellerId = "seller_2",
                sellerName = "Amina Hassan Auto",
                sellerPhone = "+254712345678",
                sellerWhatsapp = "+254712345678",
                sellerAvatar = "",
                isVerifiedSeller = true,
                isBusinessSeller = true,
                imageUrls = "img_vehicle",
                views = 310,
                isFeatured = false,
                negotiable = true,
                deliveryAvailable = false,
                createdAt = now - 3600000 * 72
            )
        )
        productDao.insertProducts(products)

        // Seed sample conversations
        val sampleConversations = listOf(
            ConversationEntity(
                id = "conv_1",
                otherUserId = "seller_1",
                otherUserName = "Guled Tech Solutions",
                otherUserAvatar = "",
                lastMessage = "Yes, we have 2 units left in stock at our Hargeisa store!",
                lastTimestamp = now - 1800000,
                unreadCount = 1,
                productId = "prod_1",
                productTitle = "iPhone 15 Pro Max - 256GB Natural Titanium",
                productPrice = 1150.0,
                productCurrency = "USD",
                productImage = "img_electronics"
            ),
            ConversationEntity(
                id = "conv_2",
                otherUserId = "seller_2",
                otherUserName = "Amina Hassan Auto",
                otherUserAvatar = "",
                lastMessage = "You are welcome for an inspection drive tomorrow morning in Hodan.",
                lastTimestamp = now - 86400000,
                unreadCount = 0,
                productId = "prod_2",
                productTitle = "Toyota Land Cruiser Prado TXL 2021",
                productPrice = 38500.0,
                productCurrency = "USD",
                productImage = "img_vehicle"
            )
        )
        for (c in sampleConversations) {
            messageDao.insertConversation(c)
        }

        val sampleMessages = listOf(
            MessageEntity(
                id = "msg_1",
                conversationId = "conv_1",
                senderId = "user_me",
                senderName = "Buyer",
                text = "Asc, is this iPhone 15 Pro Max still available?",
                timestamp = now - 3600000,
                isFromMe = true
            ),
            MessageEntity(
                id = "msg_2",
                conversationId = "conv_1",
                senderId = "seller_1",
                senderName = "Guled Tech Solutions",
                text = "Wcs! Yes, we have 2 units left in stock at our Hargeisa store!",
                timestamp = now - 1800000,
                isFromMe = false
            )
        )
        for (m in sampleMessages) {
            messageDao.insertMessage(m)
        }
    }
}
