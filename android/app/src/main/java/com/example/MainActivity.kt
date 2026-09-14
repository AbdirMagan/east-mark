package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.example.ui.components.EastMarketBottomBar
import com.example.ui.navigation.Screen
import com.example.ui.screens.CategoriesScreen
import com.example.ui.screens.ChatDetailScreen
import com.example.ui.screens.FavoritesScreen
import com.example.ui.screens.HomeScreen
import com.example.ui.screens.MessagingScreen
import com.example.ui.screens.ProductDetailScreen
import com.example.ui.screens.SellProductScreen
import com.example.ui.screens.SellerProfileScreen
import com.example.ui.screens.SettingsScreen
import com.example.ui.theme.MyApplicationTheme
import com.example.ui.viewmodel.MarketplaceViewModel
import kotlinx.coroutines.flow.collectLatest

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MyApplicationTheme {
                EastMarketApp()
            }
        }
    }
}

@Composable
fun EastMarketApp() {
    val navController = rememberNavController()
    val viewModel: MarketplaceViewModel = viewModel()
    val language by viewModel.selectedLanguage.collectAsState()
    val conversations by viewModel.conversations.collectAsState()
    val unreadCount = conversations.sumOf { it.unreadCount }

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route ?: Screen.Home.route

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        viewModel.snackbarEvent.collectLatest { message ->
            snackbarHostState.showSnackbar(message)
        }
    }

    var viewingSellerId by remember { mutableStateOf<String?>(null) }
    var activeConvId by remember { mutableStateOf<String?>(null) }

    val bottomBarRoutes = listOf(
        Screen.Home.route,
        Screen.Categories.route,
        Screen.Sell.route,
        Screen.Messages.route,
        Screen.Profile.route
    )
    val shouldShowBottomBar = currentRoute in bottomBarRoutes

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        bottomBar = {
            if (shouldShowBottomBar) {
                EastMarketBottomBar(
                    currentRoute = currentRoute,
                    language = language,
                    unreadMessagesCount = unreadCount,
                    onNavigate = { route ->
                        navController.navigate(route) {
                            popUpTo(navController.graph.findStartDestination().id) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Home.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            // 1. Home
            composable(Screen.Home.route) {
                HomeScreen(
                    viewModel = viewModel,
                    onProductClick = { product ->
                        viewModel.selectProduct(product)
                        navController.navigate(Screen.ProductDetail.route)
                    },
                    onCategoryClick = { category ->
                        viewModel.filterByCategory(category.id)
                    }
                )
            }

            // 2. Categories
            composable(Screen.Categories.route) {
                CategoriesScreen(
                    viewModel = viewModel,
                    onCategorySelected = { category ->
                        viewModel.filterByCategory(category.id)
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.Home.route) { inclusive = true }
                        }
                    }
                )
            }

            // 3. Sell
            composable(Screen.Sell.route) {
                SellProductScreen(
                    viewModel = viewModel,
                    onListingSuccess = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.Home.route) { inclusive = true }
                        }
                    }
                )
            }

            // 4. Messages
            composable(Screen.Messages.route) {
                MessagingScreen(
                    viewModel = viewModel,
                    onOpenConversation = { convId ->
                        activeConvId = convId
                        navController.navigate(Screen.ChatDetail.route)
                    }
                )
            }

            // 5. Profile & Settings
            composable(Screen.Profile.route) {
                SettingsScreen(
                    viewModel = viewModel,
                    onNavigateToFavorites = {
                        navController.navigate(Screen.Favorites.route)
                    }
                )
            }

            // 6. Favorites
            composable(Screen.Favorites.route) {
                FavoritesScreen(
                    viewModel = viewModel,
                    onProductClick = { product ->
                        viewModel.selectProduct(product)
                        navController.navigate(Screen.ProductDetail.route)
                    },
                    onBack = { navController.popBackStack() }
                )
            }

            // 7. Product Detail
            composable(Screen.ProductDetail.route) {
                val selectedProduct by viewModel.selectedProduct.collectAsState()
                if (selectedProduct != null) {
                    ProductDetailScreen(
                        product = selectedProduct!!,
                        viewModel = viewModel,
                        onBack = { navController.popBackStack() },
                        onNavigateToChat = { convId ->
                            activeConvId = convId
                            navController.navigate(Screen.ChatDetail.route)
                        },
                        onNavigateToSeller = { sellerId ->
                            viewingSellerId = sellerId
                            navController.navigate(Screen.SellerProfile.route)
                        }
                    )
                } else {
                    LaunchedEffect(Unit) {
                        navController.popBackStack()
                    }
                }
            }

            // 8. Chat Detail
            composable(Screen.ChatDetail.route) {
                val convId = activeConvId ?: viewModel.activeConversationId.collectAsState().value
                if (convId != null) {
                    ChatDetailScreen(
                        conversationId = convId,
                        viewModel = viewModel,
                        onBack = { navController.popBackStack() }
                    )
                } else {
                    LaunchedEffect(Unit) {
                        navController.popBackStack()
                    }
                }
            }

            // 9. Seller Profile
            composable(Screen.SellerProfile.route) {
                val sellerId = viewingSellerId ?: "seller_1"
                SellerProfileScreen(
                    sellerId = sellerId,
                    viewModel = viewModel,
                    onProductClick = { product ->
                        viewModel.selectProduct(product)
                        navController.navigate(Screen.ProductDetail.route)
                    },
                    onBack = { navController.popBackStack() }
                )
            }
        }
    }
}
