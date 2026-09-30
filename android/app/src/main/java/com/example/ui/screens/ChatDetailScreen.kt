package com.example.ui.screens

import androidx.compose.runtime.DisposableEffect
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.domain.LocalizationManager
import com.example.ui.theme.BrandNavy
import com.example.ui.theme.BrandTeal
import com.example.ui.theme.WhatsAppGreen
import com.example.ui.viewmodel.MarketplaceViewModel
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatDetailScreen(
    conversationId: String,
    viewModel: MarketplaceViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val language by viewModel.selectedLanguage.collectAsState()
    val messages by viewModel.activeMessages.collectAsState()
    val conversations by viewModel.conversations.collectAsState()
    val currentConv = conversations.firstOrNull { it.id == conversationId }

    var inputText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    // Loads the earlier messages and keeps the thread fresh while it is open.
    DisposableEffect(conversationId) {
        viewModel.openConversation(conversationId)
        onDispose { viewModel.closeConversation() }
    }

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    val quickResponses = listOf(
        "Is this item still available?",
        "Can we negotiate the price?",
        "Where can we meet in public?",
        "Do you provide delivery?"
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = currentConv?.otherUserName ?: "Seller Chat",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                        if (currentConv != null) {
                            Text(
                                text = "Item: ${currentConv.productTitle}",
                                fontSize = 11.sp,
                                color = BrandTeal,
                                maxLines = 1
                            )
                        }
                    }
                },
                actions = {
                    // Direct WhatsApp shortcut
                    IconButton(
                        onClick = {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://api.whatsapp.com/send?text=Asc!"))
                            try { context.startActivity(intent) } catch (e: Exception) {}
                        }
                    ) {
                        Text("WA", color = WhatsAppGreen, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                    // Call shortcut
                    IconButton(
                        onClick = {
                            val dialIntent = Intent(Intent.ACTION_DIAL)
                            context.startActivity(dialIntent)
                        }
                    ) {
                        Icon(Icons.Filled.Phone, contentDescription = "Call", tint = BrandTeal)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        bottomBar = {
            Surface(
                color = MaterialTheme.colorScheme.surface,
                shadowElevation = 8.dp,
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
            ) {
                Column(modifier = Modifier.padding(8.dp)) {
                    // Quick reply chips
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState())
                            .padding(bottom = 6.dp),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        quickResponses.forEach { prompt ->
                            Surface(
                                color = MaterialTheme.colorScheme.surfaceVariant,
                                shape = RoundedCornerShape(16.dp),
                                modifier = Modifier.clickable {
                                    viewModel.sendMessage(prompt)
                                }
                            ) {
                                Text(
                                    text = prompt,
                                    fontSize = 11.sp,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }

                    // Message input field + send button
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = inputText,
                            onValueChange = { inputText = it },
                            placeholder = {
                                Text(LocalizationManager.getString("type_message", language), fontSize = 13.sp)
                            },
                            modifier = Modifier
                                .weight(1f)
                                .height(50.dp)
                                .testTag("chat_message_input"),
                            shape = RoundedCornerShape(24.dp),
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = BrandTeal,
                                unfocusedBorderColor = Color(0xFFCBD5E1)
                            )
                        )

                        Spacer(modifier = Modifier.width(8.dp))

                        IconButton(
                            onClick = {
                                if (inputText.isNotBlank()) {
                                    viewModel.sendMessage(inputText.trim())
                                    inputText = ""
                                }
                            },
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(BrandTeal)
                                .testTag("chat_send_btn")
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.Send,
                                contentDescription = "Send",
                                tint = Color.White,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                }
            }
        }
    ) { innerPadding ->
        LazyColumn(
            state = listState,
            modifier = modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(Color(0xFFF1F5F9))
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            if (messages.isEmpty()) {
                item {
                    Text(
                        text = "Say hello. Ask about the item, the price or where to meet.",
                        color = Color.Gray,
                        fontSize = 13.sp,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 24.dp)
                    )
                }
            }
            items(messages, key = { it.id }) { msg ->
                val isMe = msg.isFromMe
                val align = if (isMe) Alignment.End else Alignment.Start
                val bg = if (isMe) BrandNavy else Color.White
                val textColor = if (isMe) Color.White else Color(0xFF0F172A)

                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = align
                ) {
                    Surface(
                        color = bg,
                        shape = RoundedCornerShape(
                            topStart = 14.dp,
                            topEnd = 14.dp,
                            bottomStart = if (isMe) 14.dp else 2.dp,
                            bottomEnd = if (isMe) 2.dp else 14.dp
                        ),
                        shadowElevation = 1.dp,
                        modifier = Modifier.widthIn(max = 280.dp)
                    ) {
                        Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                            Text(
                                text = msg.text,
                                color = textColor,
                                fontSize = 14.sp
                            )
                            Spacer(modifier = Modifier.height(3.dp))
                            val time = SimpleDateFormat("h:mm a", Locale.getDefault()).format(Date(msg.timestamp))
                            Text(
                                text = when {
                                    msg.pending -> "Sending…"
                                    isMe && msg.readAt != null -> "$time · Seen"
                                    else -> time
                                },
                                color = if (isMe) Color.White.copy(alpha = 0.7f) else Color.Gray,
                                fontSize = 10.sp,
                                modifier = Modifier.align(Alignment.End)
                            )
                        }
                    }
                }
            }
        }
    }
}
