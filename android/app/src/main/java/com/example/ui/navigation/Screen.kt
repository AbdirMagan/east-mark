package com.example.ui.navigation

sealed class Screen(val route: String) {
    object Home : Screen("home")
    object Categories : Screen("categories")
    object Sell : Screen("sell")
    object Messages : Screen("messages")
    object Profile : Screen("profile")
    object ProductDetail : Screen("product_detail")
    object ChatDetail : Screen("chat_detail")
    object SellerProfile : Screen("seller_profile")
    object Favorites : Screen("favorites")
    object VideoFeed : Screen("video_feed")
    object Login : Screen("login")
    object SignUp : Screen("signup")
}
