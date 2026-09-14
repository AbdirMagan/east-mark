package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.AppLanguage
import com.example.domain.LocalizationManager
import com.example.ui.navigation.Screen
import com.example.ui.theme.BrandNavy
import com.example.ui.theme.BrandTeal

@Composable
fun EastMarketBottomBar(
    currentRoute: String,
    language: AppLanguage,
    unreadMessagesCount: Int,
    onNavigate: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    NavigationBar(
        modifier = modifier.testTag("bottom_navigation_bar"),
        containerColor = MaterialTheme.colorScheme.surface,
        tonalElevation = 6.dp,
        windowInsets = WindowInsets.navigationBars
    ) {
        // Home
        BottomNavItem(
            selected = currentRoute == Screen.Home.route,
            onClick = { onNavigate(Screen.Home.route) },
            icon = if (currentRoute == Screen.Home.route) Icons.Filled.Home else Icons.Outlined.Home,
            label = LocalizationManager.getString("home", language),
            testTag = "nav_home"
        )

        // Categories
        BottomNavItem(
            selected = currentRoute == Screen.Categories.route,
            onClick = { onNavigate(Screen.Categories.route) },
            icon = if (currentRoute == Screen.Categories.route) Icons.Filled.GridView else Icons.Outlined.GridView,
            label = LocalizationManager.getString("categories", language),
            testTag = "nav_categories"
        )

        // Sell (+) Action
        NavigationBarItem(
            selected = currentRoute == Screen.Sell.route,
            onClick = { onNavigate(Screen.Sell.route) },
            icon = {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(BrandTeal)
                        .testTag("nav_sell_fab"),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Filled.Add,
                        contentDescription = "Sell",
                        tint = Color.White,
                        modifier = Modifier.size(26.dp)
                    )
                }
            },
            label = {
                Text(
                    text = LocalizationManager.getString("sell", language),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = BrandTeal
                )
            },
            colors = NavigationBarItemDefaults.colors(
                indicatorColor = Color.Transparent
            )
        )

        // Messages
        BottomNavItem(
            selected = currentRoute == Screen.Messages.route,
            onClick = { onNavigate(Screen.Messages.route) },
            icon = if (currentRoute == Screen.Messages.route) Icons.AutoMirrored.Filled.Chat else Icons.AutoMirrored.Outlined.Chat,
            label = LocalizationManager.getString("messages", language),
            badgeCount = unreadMessagesCount,
            testTag = "nav_messages"
        )

        // Profile / Settings
        BottomNavItem(
            selected = currentRoute == Screen.Profile.route,
            onClick = { onNavigate(Screen.Profile.route) },
            icon = if (currentRoute == Screen.Profile.route) Icons.Filled.Person else Icons.Outlined.Person,
            label = LocalizationManager.getString("profile", language),
            testTag = "nav_profile"
        )
    }
}

@Composable
private fun RowScope.BottomNavItem(
    selected: Boolean,
    onClick: () -> Unit,
    icon: ImageVector,
    label: String,
    badgeCount: Int = 0,
    testTag: String
) {
    NavigationBarItem(
        selected = selected,
        onClick = onClick,
        modifier = Modifier.testTag(testTag),
        icon = {
            if (badgeCount > 0) {
                BadgedBox(badge = { Badge { Text("$badgeCount") } }) {
                    Icon(
                        imageVector = icon,
                        contentDescription = label,
                        modifier = Modifier.size(22.dp)
                    )
                }
            } else {
                Icon(
                    imageVector = icon,
                    contentDescription = label,
                    modifier = Modifier.size(22.dp)
                )
            }
        },
        label = {
            Text(
                text = label,
                fontSize = 10.sp,
                fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal
            )
        },
        colors = NavigationBarItemDefaults.colors(
            selectedIconColor = BrandNavy,
            unselectedIconColor = Color(0xFF64748B),
            selectedTextColor = BrandNavy,
            unselectedTextColor = Color(0xFF64748B),
            indicatorColor = Color(0xFFE2E8F0)
        )
    )
}
