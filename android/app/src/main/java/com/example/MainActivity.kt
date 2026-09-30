package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import coil.Coil
import coil.ImageLoader
import coil.decode.SvgDecoder
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
import com.example.ui.components.EastMarketHeader
import com.example.ui.screens.CategoriesScreen
import com.example.ui.screens.ChatDetailScreen
import com.example.ui.screens.FavoritesScreen
import com.example.ui.screens.HomeScreen
import com.example.ui.screens.LoginScreen
import com.example.ui.screens.MessagingScreen
import com.example.ui.screens.ProductDetailScreen
import com.example.ui.screens.SellProductScreen
import com.example.ui.screens.SellerProfileScreen
import com.example.ui.screens.SettingsScreen
import com.example.ui.screens.VideoFeedScreen
import com.example.ui.screens.SignUpScreen
import com.example.ui.theme.MyApplicationTheme
import com.example.ui.viewmodel.MarketplaceViewModel
import kotlinx.coroutines.flow.collectLatest

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        // Listing thumbnails from the seed data are inline SVG data: URIs;
        // SvgDecoder is what lets Coil render those instead of erroring out.
        Coil.setImageLoader(
            ImageLoader.Builder(applicationContext)
                .components { add(SvgDecoder.Factory()) }
                .build()
        )
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

    // Every screen carries the app's own header and its navigation buttons: a
    // marketplace where the logo, the city, the search box and the tabs vanish
    // when you open a listing feels like two different apps.
    val rootRoutes = listOf(
        Screen.Home.route,
        Screen.Categories.route,
        Screen.Sell.route,
        Screen.Messages.route,
        Screen.Profile.route
    )
    // The feed is reached from the home screen, so it keeps a back arrow even
    // though the tabs stay visible underneath it.
    val isRoot = currentRoute in rootRoutes
    // The conversation screen is the one exception to the search box: a query
    // typed there would have nowhere to go.
    val showSearch = currentRoute != Screen.ChatDetail.route

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            EastMarketHeader(
                viewModel = viewModel,
                showSearch = showSearch,
                onBack = if (isRoot) null else ({ navController.popBackStack(); Unit })
            )
        },
        bottomBar = {
            run {
                EastMarketBottomBar(
                    currentRoute = currentRoute,
                    language = language,
                    unreadMessagesCount = unreadCount,
                    onNavigate = { route ->
                        navController.navigate(route) {
                            // Clear everything above the start destination, and
                            // for Home the start destination itself, so the tab
                            // always lands on that screen.
                            //
                            // saveState/restoreState used to be set here, which
                            // is the pattern for tabs with their own nested
                            // graphs. With one flat graph it restored whatever
                            // had been on top last time -- tapping Home from a
                            // listing or the video feed put you straight back
                            // on the screen you were trying to leave.
                            popUpTo(navController.graph.findStartDestination().id) {
                                inclusive = route == Screen.Home.route
                            }
                            launchSingleTop = true
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
                    },
                    onNavigate = { route -> navController.navigate(route) }
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
                    onSignIn = { navController.navigate(Screen.Login.route) },
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
                    },
                    onNavigateToLogin = {
                        navController.navigate(Screen.Login.route)
                    },
                    onNavigateToSignUp = {
                        navController.navigate(Screen.SignUp.route)
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

            // 6b. Video feed -- listings that were filmed, full screen
            composable(Screen.VideoFeed.route) {
                VideoFeedScreen(
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

            // Login
            composable(Screen.Login.route) {
                LoginScreen(
                    viewModel = viewModel,
                    onSignedIn = { navController.popBackStack() },
                    onNavigateToSignUp = {
                        navController.navigate(Screen.SignUp.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    },
                    onBack = { navController.popBackStack() }
                )
            }

            // Sign up
            composable(Screen.SignUp.route) {
                SignUpScreen(
                    viewModel = viewModel,
                    onSignedUp = { navController.popBackStack() },
                    onNavigateToLogin = {
                        navController.navigate(Screen.Login.route) {
                            popUpTo(Screen.SignUp.route) { inclusive = true }
                        }
                    }
                )
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
