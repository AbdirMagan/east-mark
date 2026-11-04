package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.MailOutline
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.AppNotification
import com.example.data.repository.AuthState
import com.example.domain.LocalizationManager
import com.example.ui.theme.BrandGold
import com.example.ui.theme.BrandNavy
import com.example.ui.theme.BrandTeal
import com.example.ui.viewmodel.MarketplaceViewModel
import java.util.concurrent.TimeUnit

/**
 * What the marketplace has told this person.
 *
 * The same list the web app shows, from the same endpoint. Opening one marks
 * it read and goes where it points: a message to the conversation, a
 * moderation decision to the listing. Notifications that point nowhere -- a
 * system notice -- just stop being unread.
 */
@Composable
fun NotificationsScreen(
    viewModel: MarketplaceViewModel,
    onOpenConversation: (String) -> Unit,
    onOpenProduct: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val language by viewModel.selectedLanguage.collectAsState()
    val authState by viewModel.authState.collectAsState()
    val notifications by viewModel.notifications.collectAsState()
    val signedIn = authState is AuthState.SignedIn

    LaunchedEffect(signedIn) {
        if (signedIn) viewModel.refreshNotifications()
    }

    if (!signedIn) {
        EmptyState(
            icon = Icons.Filled.Notifications,
            title = LocalizationManager.getString("notifications", language),
            body = LocalizationManager.getString("notifications_signed_out", language),
            modifier = modifier
        )
        return
    }

    val unread = notifications.count { !it.read }

    Column(modifier = modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = LocalizationManager.getString("notifications", language),
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
            if (unread > 0) {
                Text(
                    text = LocalizationManager.getString("mark_all_read", language),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = BrandTeal,
                    modifier = Modifier
                        .clickable { viewModel.markAllNotificationsRead() }
                        .testTag("mark_all_read_btn")
                )
            }
        }

        if (notifications.isEmpty()) {
            EmptyState(
                icon = Icons.Filled.Notifications,
                title = LocalizationManager.getString("notifications_empty", language),
                body = LocalizationManager.getString("notifications_empty_body", language),
                modifier = Modifier.weight(1f)
            )
        } else {
            LazyColumn(
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxSize().testTag("notification_list")
            ) {
                items(notifications, key = { it.id }) { notification ->
                    NotificationRow(
                        notification = notification,
                        onClick = {
                            viewModel.markNotificationRead(notification.id)
                            when {
                                notification.conversationId != null ->
                                    onOpenConversation(notification.conversationId)
                                notification.productId != null -> onOpenProduct(notification.productId)
                            }
                        }
                    )
                }
                item { Spacer(modifier = Modifier.height(16.dp)) }
            }
        }
    }
}

@Composable
private fun NotificationRow(notification: AppNotification, onClick: () -> Unit) {
    Surface(
        color = if (notification.read) {
            MaterialTheme.colorScheme.surface
        } else {
            BrandTeal.copy(alpha = 0.08f)
        },
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
    ) {
        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.Top) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(tintFor(notification.type).copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = iconFor(notification.type),
                    contentDescription = null,
                    tint = tintFor(notification.type),
                    modifier = Modifier.size(19.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = notification.title,
                    fontSize = 14.sp,
                    fontWeight = if (notification.read) FontWeight.SemiBold else FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 2
                )
                if (notification.body.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = notification.body,
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = relativeTime(notification.createdAt),
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                )
            }

            if (!notification.read) {
                Box(
                    modifier = Modifier
                        .padding(top = 4.dp)
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(BrandTeal)
                )
            }
        }
    }
}

@Composable
private fun EmptyState(icon: ImageVector, title: String, body: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxSize().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
            modifier = Modifier.size(44.dp)
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = title,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = body,
            fontSize = 13.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.fillMaxWidth(),
            textAlign = androidx.compose.ui.text.style.TextAlign.Center
        )
    }
}

/** A glyph per kind, so the list scans without reading every line. */
private fun iconFor(type: String): ImageVector = when (type) {
    "new_message" -> Icons.Filled.MailOutline
    "listing_approved", "verification_result" -> Icons.Filled.CheckCircle
    "listing_rejected" -> Icons.Filled.Warning
    else -> Icons.Filled.Notifications
}

private fun tintFor(type: String): Color = when (type) {
    "new_message" -> BrandTeal
    "listing_approved", "verification_result" -> BrandTeal
    "listing_rejected" -> BrandGold
    else -> BrandNavy
}

/** "3h" reads faster than a date when everything is from this week. */
private fun relativeTime(millis: Long): String {
    val elapsed = (System.currentTimeMillis() - millis).coerceAtLeast(0)
    val minutes = TimeUnit.MILLISECONDS.toMinutes(elapsed)
    if (minutes < 1) return "now"
    if (minutes < 60) return "${minutes}m"
    val hours = TimeUnit.MILLISECONDS.toHours(elapsed)
    if (hours < 24) return "${hours}h"
    val days = TimeUnit.MILLISECONDS.toDays(elapsed)
    if (days < 7) return "${days}d"
    return "${days / 7}w"
}
